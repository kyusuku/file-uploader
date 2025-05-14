# File Uploader

A Node.js and Express application allowing users to upload and download files, with folder management functionality. This project uses Express for the server, EJS templating for views, and PostgreSQL (via Prisma) to store file and user data.

## Try It Out

The live demo can be found [here](https://file-uploader-production-3bdf.up.railway.app/).

## Features

- **User Authentication:** Users can sign up, log in, and log out before managing files.
- **File Uploads:** Authenticated users can upload files (stored in PostgreSQL as binary data).
- **Folder Management:** Create, rename, delete folders. Files can be organized under these folders.
- **EJS Templating:** Renders views for page interactivity (folder view, uploads, etc.).
- **PostgreSQL Integration:** Stores user accounts, folder metadata, and file data.

## Project Structure

```
file-uploader
├── .env                              # Environment variables (ignored by Git)
├── .gitignore
├── app.js                            # Main application file
├── package.json                      # Project metadata and dependencies
├── prisma/
│   ├── schema.prisma                 # Prisma schema for models
│   └── migrations/                   # Migration files
├── public/
│   ├── output.css                    # Compiled CSS from Tailwind (if applicable)
│   └── styles.css                    # Base styles
├── uploads/                          # Temporary storage for uploaded files
├── views/
│   ├── folder.ejs                    # Folder page displaying files
│   ├── home.ejs                      # Home page listing folders
│   ├── index.ejs                     # Login page
│   └── sign-up.ejs                   # Sign-up page
└── README.md                         # This file
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [PostgreSQL](https://www.postgresql.org/) running locally or remotely
- An `.env` file in the project root (see [Environment Variables](#environment-variables))

### Environment Variables

Create an `.env` file for important settings:

```
DATABASE_URL="your-postgresql-connection-string"
PORT=3000
```

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/kyusuku/file-uploader.git
   cd file-uploader
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up the Database**

   Update your `.env` with the correct database info, then run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### Running the Application

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- **Upload Files:** Authenticate, navigate to a folder, and use the “Upload File” button to pick and upload files.
- **Manage Folders:** Create, rename, or delete folders—files are automatically associated with each folder.
- **Download Files:** Click “Download” next to a file to retrieve it with the original name and MIME type.

## Customization

- **Views:** Modify EJS files in `views/` for deeper branding or layout changes.
- **Routes:** Update routes in `app.js` to add custom logic.
- **Database:** Adjust models or relationships in `prisma/schema.prisma`.

## Acknowledgments

- **Passport.js** & **Express-Session** for user auth and session handling.
- **Prisma** for database schema and migrations.
- **Express & EJS** for straightforward server setup and templating.

## Security

- Keep your `.env` file out of version control.
- Use parameterized queries (Prisma handles this) to avoid SQL injection.
- Consider HTTPS in production to protect session data.