require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
    cors({
        origin: "http://localhost:3000", // Allow frontend requests
        credentials: true, // Allow cookies in requests
    })
);

// 🔹 MongoDB Connection
mongoose
    .connect("mongodb://localhost:27017/villasDB", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// 🔹 User Schema & Model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// 🔹 Cluster Schema & Model
const VillaSchema = new mongoose.Schema({
    id: { type: String, required: true },
    status: { type: String, enum: ["Available", "Sold", "Under Construction"], required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
});

const ClusterSchema = new mongoose.Schema({
    clusterName: { type: String, required: true },
    clusterId: { type: String, required: true, unique: true },
    villas: [VillaSchema], // Array of villas
    x: { type: Number, required: true },
    y: { type: Number, required: true },
});
const Cluster = mongoose.model("Cluster", ClusterSchema);

// 🔹 Contact Us Schema & Model
const ContactSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    residence: { type: String, required: true },
    nationality: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: "Pending" }, // New, In Progress, Resolved
    createdAt: { type: Date, default: Date.now },
    updatedBy: { username: String }, // Admin who updates it
    updatedAt: { type: Date, default: Date.now },
    salesComment: { type: String }
});
const Contact = mongoose.model("Contact", ContactSchema);

// 🔹 Middleware to Authenticate JWT Token
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token; // Get token from cookies

    if (!token) {
        return res.status(403).json({ error: "Forbidden - No Token Provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Forbidden - Invalid Token" });
        }
        req.user = decoded; // Attach user info to the request
        next();
    });
};

// 🔹 User Registration
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 User Login with JWT & Cookies
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET);

        // Set token in HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: false,
            secure: false, // Change to `true` in production (HTTPS)
            sameSite: "lax",
        });

        res.json({ message: "Login successful", token: token, user: { id: user._id, email: user.email, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Logout (Clear Token from Cookies)
app.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully!" });
});

// 🔹 Add a New Cluster
app.post("/add-cluster", async (req, res) => {
    try {
        const newCluster = new Cluster(req.body);
        await newCluster.save();
        res.status(201).json({ message: "Cluster added successfully!", data: newCluster });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Get All Clusters
app.get("/clusters", async (req, res) => {
    try {
        const clusters = await Cluster.find();
        res.json(clusters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Get a Cluster by clusterId
app.get("/clusters/clusterId/:clusterId", async (req, res) => {
    try {
        const cluster = await Cluster.findOne({ clusterId: req.params.clusterId });
        if (!cluster) return res.status(404).json({ error: "Cluster not found" });
        res.json(cluster);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});
app.get("/villa/search/:combinedId", async (req, res) => {
    try {
        const combinedId = req.params.combinedId;
        const [clusterId, villaId] = combinedId.split("_");

        if (!clusterId || !villaId) {
            return res.status(400).json({ error: "Invalid format. Use clusterId_villaId" });
        }

        // 🔍 Find the cluster by clusterId
        const cluster = await Cluster.findOne({ clusterId });

        if (!cluster) {
            return res.status(404).json({ error: "Cluster not found" });
        }

        // 🔍 Find the villa inside the cluster by villaId
        const villa = cluster.villas.find((v) => v.id === villaId);

        if (!villa) {
            return res.status(404).json({ error: "Villa not found in cluster" });
        }

        res.json({
            cluster: {
                clusterId: cluster.clusterId,
                clusterName: cluster.clusterName,
            },
            villa,
        });
    } catch (error) {
        console.error("Error searching for villa:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// 🔹 Store Contact Us Messages in DB
app.post("/contact", async (req, res) => {
    try {
        const { firstName, lastName, email, phone, residence, nationality, message, callTime } = req.body;

        // Ensure all required fields are present
        if (!firstName || !lastName || !email || !phone || !residence || !nationality || !message || !callTime) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Create and save the new contact entry
        const newContact = new Contact({
            firstName,
            lastName,
            email,
            phone,
            residence,
            nationality,
            callTime,
            message,
            callTime
        });

        await newContact.save();
        res.status(201).json({ message: "Your message has been received!", contact: newContact });
    } catch (error) {
        console.error("❌ Error saving contact:", error);
        res.status(500).json({ error: "Error saving contact message" });
    }
});

// 🔹 Retrieve All Contact Messages (Admin Only)
app.get("/contacts", authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: "Error fetching messages" });
    }
});


app.put("/contacts/:id", authenticateToken, async (req, res) => {
    try {
        const { status, salesComment } = req.body;

        const updatedContact = await Contact.findByIdAndUpdate(
            req.params.id,
            {
                status,
                salesComment,
                updatedBy: { username: req.user.username, email: req.user.email }, // Attach logged-in user
                updatedAt: new Date(),
            },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({ error: "Contact not found" });
        }

        res.json({ message: "Contact updated successfully", data: updatedContact });
    } catch (error) {
        res.status(500).json({ error: "Error updating contact" });
    }
});

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
