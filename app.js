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

app.get("/home", ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { parentId: null },
    });
    const files = await prisma.file.findMany({
      where: {
        folderId: null,
      },
    });
    res.render("home", {
      title: "File Uploader",
      newFolder: false,
      newFile: false,
      folders,
      files,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/:parentName/new-folder", ensureAuthenticated, (req, res, next) => {
  res.render("home", {
    title: "File Uploader",
    newFolder: true,
    newFile: false,
    parentName: req.params.parentName,
  });
});

app.post("/:parentName/new-folder", async (req, res) => {
  try {
    const parentFolder = await prisma.folder.findUnique({
      where: {
        name: req.params.parentName,
      },
    });
    await prisma.folder.create({
      data: {
        name: req.body.newFolderName,
        parentId: parentFolder.id,
      },
    });
    res.redirect(`/${req.params.parentName}`);
  } catch (err) {
    console.error(err);
    res.redirect("/home");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`File Uploader App listening on port ${PORT}!`);
});
