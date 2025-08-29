// const { PrismaClient } = require("@prisma/client");
// const express = require("express");
// const app = express();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken'); 
// var cors = require('cors');
// app.use(cors());

// app.use(express.json());

// const prisma = new PrismaClient();


// app.post("/register", async (req, res) => {
//     const userdata = req.body;
//     const existdata = await prisma.job.findFirst({
//         where: {
//             email: userdata.email
//         }
//     });

//     if (existdata === null) {
      
//         const hashedpass = await bcrypt.hash(userdata.password, 10);
       

//         const register = await prisma.job.create({
//             data: {
//                 name: userdata.name,
//                 email: userdata.email,
//                 phone: userdata.phone,
//                 password: hashedpass 
//             }
//         });

//         res.json({ message: "registered successfully", data: register });
//     } else {
//         res.json({
//             message: "Email already exists"
//         });
//     }
// });
// console.log("DATABASE_URL:", process.env.DATABASE_URL);

// app.post("/login", async (req, res) => {
//     const userdata = req.body;
//     const existeduser = await prisma.job.findFirst({
//         where: {
//             email: userdata.email
//         }
//     });

//     if (existeduser === null) {
//         res.json({ message: "User ID not found" });
//     } else {
//         console.log("Entered password:", userdata.password);
//         console.log("Stored hashed password:", existeduser.password); 

   
//         const PasswordValid = await bcrypt.compare(userdata.password, existeduser.password);

//         if (PasswordValid) {
//             const accesstoken = jwt.sign({ user_id: existeduser.id }, 'your_secret_key', {
//                 expiresIn: "1h"
//             });
//             const refreshtoken = jwt.sign({ user_id: existeduser.id }, 'your_refresh_secret_key', {
//                 expiresIn: "7d"
//             });

//             await prisma.token.create({
//                 data: {
//                     user_id: existeduser.id,
//                     refreshtoken: refreshtoken
//                 }
//             });

//             res.json({
//                 message: "Login successful",
//                 accesstoken,
//                 refreshtoken
//             });
//         } else {
//             res.json({ message: "Invalid password" });
//         }
//     }
// });

// app.post('/jobslist', async (req, res) => {
//     const { title, company, location, experience, skills, url } = req.body;
//     try {
//       const job = await prisma.joblist.create({
//         data: {
//           title,
//           company,
//           location,
//           experience,
//           skills,
//           url,
//         },
//       });
//       res.status(201).json(job);
//     } catch (error) {
//       res.status(500).json({ error: 'An error occurred while creating the job.',error });
//     }
//   });
  
//   // GET endpoint to retrieve all Jobs
//   app.get('/jobslist', async (req, res) => {
//     try {
//       const jobs = await prisma.joblist.findMany();
//       res.status(200).json(jobs);
//     } catch (error) {
//       res.status(500).json({ error: 'An error occurred while retrieving jobs.' });
//     }
//   });
  


// app.listen(4000, () => {
//     console.log("Server running on port 4000");
// });



const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const crypto = require("crypto");


const app = express();
const prisma = new PrismaClient();

// AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to upload single photo
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Unique filename
    const fileName = `lms/profilePics/${crypto.randomUUID()}${path.extname(req.file.originalname)}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const photoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save to database
    const newUser = await prisma.user.create({
      data: { name, email, photoUrl },
    });

    res.json({ message: "Upload successful", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});


