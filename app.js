const express = require("express");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const uploadDir = process.env.UPLOAD_DIR || "/var/www/registration_app/registration_app_uploads";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.use(express.static("public"));

app.use("/uploads", express.static(uploadDir));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {

        const filename =
            Date.now() +
            "-" +
            file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");

        cb(null, filename);
    }
});

const upload = multer({
    storage: storage
});


/*
   HEALTH CHECK
*/

app.get("/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.status(200).json({
            status: "UP",
            server: require("os").hostname()
        });

    } catch (error) {

        res.status(500).json({
            status: "DOWN"
        });
    }
});


/*
   HOME PAGE
*/

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


/*
   REGISTRATION
*/

app.post(
    "/register",
    upload.single("profile"),
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone
            } = req.body;

            if (!name || !email || !phone) {

                return res.status(400).send(
                    "All fields are required"
                );

            }

            let profile = null;

            if (req.file) {

                profile =
                    "/uploads/" +
                    req.file.filename;
            }

            const sql = `
                INSERT INTO registrations
                (name, email, phone, profile)
                VALUES (?, ?, ?, ?)
            `;

            await pool.execute(
                sql,
                [
                    name,
                    email,
                    phone,
                    profile
                ]
            );

            res.sendFile(
                path.join(
                    __dirname,
                    "views",
                    "success.html"
                )
            );

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Registration failed"
            );
        }
    }
);


/*
   SERVER
*/

app.listen(
    PORT,
    "127.0.0.1",
    () => {

        console.log(
            `Application running on port ${PORT}`
        );

    }
);
