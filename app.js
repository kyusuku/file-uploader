require("dotenv").config();
const path = require("node:path");
const express = require("express");
const expressSession = require("express-session");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const multer = require('multer');
const upload = multer({ dest: './uploads/' });
const fs = require('fs');

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

app.use(
  expressSession({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    },
    secret: "a santa at nasa",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          username: `${username}`,
        },
      });

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: `${id}`,
      },
    });

    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.get("/", (req, res) => {
  res.render("index", {
    title: "File Uploader",
  });
});

app.get("/sign-up", (req, res) => {
  res.render("sign-up", {
    title: "File Uploader",
  });
});

app.post("/sign-up", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const match = bcrypt.compareSync(req.body.confirmPassword, hashedPassword);
    const existingUser = await prisma.user.findFirst({
      where: {
        username: req.body.username,
      },
    });

    if (existingUser) {
      return res.render("sign-up", {
        title: "File Uploader",
        error: "Username is already taken. Please try again.",
      });
    }

    if (!match) {
      return res.render("sign-up", {
        title: "File Uploader",
        error: "Your passwords do not match. Please try again.",
      });
    }
    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        password: hashedPassword,
      },
    });
    console.log(user);
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/",
  })
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/home", ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
      }
    });
    res.render("home", {
      title: "File Uploader",
      folders,
      error: null,
      newFolder: false,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

app.post("/home", ensureAuthenticated, async (req, res) => {
  try {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: req.body.folderName,
        userId: req.user.id,
      },
    });

    if (existingFolder) {
      return res.render("home", {
        title: "File Uploader",
        error: "Folder name already exists. Please try again.",
      });
    }

    await prisma.folder.create({
      data: {
        name: req.body.folderName,
        userId: req.user.id,
      },
    });
    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.redirect("/home");
  }
});

app.get("/new-folder", ensureAuthenticated, async (req, res, next) => {
  const folders = await prisma.folder.findMany({
    where: {
      userId: req.user.id,
    },
  });

  res.render("home", {
    title: "File Uploader",
    error: null,
    folders,
    newFolder: true,
  });
});

app.get("/home/:folderName", ensureAuthenticated, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        name: req.params.folderName,
        userId: req.user.id,
      },
    });

    const folderName = folder.name;

    const files = await prisma.file.findMany({
      where: {
        folderId: folder.id,
        userId: req.user.id,
      },
    });

    res.render("folder", {
      title: "File Uploader",
      folderName,
      files,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/home");
  }
});

app.get("/home/:folderName/upload-file", ensureAuthenticated, (req, res) => {
  const folderName = req.params.folderName;

  res.render("folder", {
    title: "File Uploader",
    folderName,
    error: null,
    uploadFile: true,
  });
});

app.post('/home/:folderName/upload-file', ensureAuthenticated, upload.single('uploaded-file'), async (req, res) => {
  const folder = await prisma.folder.findFirst({
    where: {
      name: req.params.folderName,
      userId: req.user.id,
    }
  })
  
  const file = req.file;
  const fileData = fs.readFileSync(file.path);

  const fileName = req.body.fileName;
  const filePath = file.path;
  const fileSize = file.size;
  const folderId = folder.id;

  await prisma.file.create({
    data: {
      name: fileName,
      size: fileSize,
      fileUrl: filePath,
      data: fileData,
      folderId,
      userId: req.user.id,
    }
  })

  fs.unlinkSync(file.path);

  res.redirect(`/home/${folder.name}`);
})

app.get('/home/:folderName/:fileName/download', ensureAuthenticated, async (req, res) => {
  const fileName = req.params.fileName;

  const file = await prisma.file.findFirst({
    where: {
      name: fileName,
      userId: req.user.id,
    }
  });

  if (!file) {
    return res.status(404).send('File not found');
  }

  res.set('Content-Disposition', `attachment; filename="${file.name}"`);
  res.set('Content-Type', 'application/octet-stream');
  res.send(file.data);
})

app.get("/home/:folderName/rename-folder", ensureAuthenticated, (req, res) => {
  try {
    const folderName = req.params.folderName;

    res.render("folder", {
      title: "File Uploader",
      folderName,
      error: null,
      renameFolder: true,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/home/:folderName/");
  }
});

app.post(
  "/home/:folderName/rename-folder",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const folderName = req.params.folderName;
      const newFolderName = req.body.folderName;
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name: newFolderName,
          userId: req.user.id,
        },
      });

      if (existingFolder) {
        return res.render("folder", {
          title: "File Uploader",
          folderName,
          error: "Folder name already exists. Please try again.",
        });
      }

      await prisma.folder.update({
        where: {
          name: folderName,
          userId: req.user.id,
        },
        data: {
          name: newFolderName,
        },
      });

      res.redirect(`/home/${newFolderName}`);
    } catch (err) {
      console.error(err);
      res.redirect("/home/:folderName/");
    }
  }
);

app.post(
  "/home/:folderName/delete-folder",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const folderName = req.params.folderName;

      const folder = await prisma.folder.findFirst({
        where: {
          name: folderName,
          userId: req.user.id,
        }
      })

      const files = await prisma.file.findMany({
        where: {
          folderId: folder.id,
          userId: req.user.id,
        }
      })

      for (const file of files) {
        try {
          if (fs.existsSync(file.fileUrl)) {
            fs.unlinkSync(file.fileUrl);
          } 
        } catch (err) {
          console.error(err);
        }
      }

      await prisma.file.deleteMany({
        where: {
          folderId: folder.id,
          userId: req.user.id,
        }
      })

      await prisma.folder.delete({
        where: {
          name: folderName,
          userId: req.user.id,
        },
      });
      res.redirect("/home");
    } catch (err) {
      console.error(err);
      res.redirect("/home/:folderName/");
    }
  }
);

app.get('/home/:folderName/:fileName', ensureAuthenticated, async (req, res) => {
  const folderName = req.params.folderName;
  const fileName = req.params.fileName;

  const file = await prisma.file.findFirst({
    where: {
      name: fileName,
      userId: req.user.id,
    }
  });

  res.render('folder', {
    title: 'File Uploader',
    folderName,
    fileName,
    file,
    error: null,
    seeFileDetail: true,
  })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`File Uploader App listening on port ${PORT}!`);
});
