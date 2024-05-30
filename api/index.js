const express = require("express");
const cors = require("cors");
const path = require("path");
// In server.js (for the server)
const request = require("request");

const app = express();
const port = 5000;
const nodemailer = require("nodemailer");
//require("dotenv").config({ path: path.resolve(__dirname, "./.env") }); // Load environment variables from root directory
app.use(cors());
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Verify the webhook
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Handle incoming messages
app.post("/webhook", (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(function (entry) {
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      let sender_psid = webhookEvent.sender.id;
      if (webhookEvent.message) {
        handleMessage(sender_psid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(sender_psid, webhookEvent.postback);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(sender_psid, received_message) {
  let response;

  if (received_message.text) {
    response = {
      text: `You sent the message: "${received_message.text}". Now send me an image!`,
    };
  } else if (received_message.attachments) {
    response = {
      text: "Thanks for the image!",
    };
  }

  callSendAPI(sender_psid, response);
}

function handlePostback(sender_psid, received_postback) {
  let response;

  let payload = received_postback.payload;

  if (payload === "yes") {
    response = { text: "Thanks!" };
  } else if (payload === "no") {
    response = { text: "Oops, try sending another image." };
  }

  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  let request_body = {
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}

app.listen(1337, () => console.log("webhook is listening"));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify the transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log("transport error");
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

// Define a route to send emails
app.post("/api/send-email", async (req, res) => {
  const { subject, text } = req.body;

  // res.status(200).send({ message: "hello" });
  // res.status(200).send({ email: req.body });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "emaknoel909@gmail.com",
    subject,
    text,
  };

  const mailOptions1 = {
    from: process.env.EMAIL_USER,
    to: subject,
    subject: "Contact success",
    text: "Thanks for your contact.I will be in touch with you soon.",
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    const result1 = await transporter.sendMail(mailOptions1);
    if (result?.error || result1?.error) {
      res.status(500).send("Failed to send email");
    } else {
      res.status(200).send("Email sent successfully");
    }
  } catch (error) {
    res.status(500).send("Failed to send email");
  }
});

app.get("/api", (req, res) => {
  res.json({
    message: "Hello from the server!",
    email: process.env.EMAIL_USER,
  });
});
app.get("/", (req, res) => {
  res.json({
    message: "Hello from the server!",
    email: process.env.EMAIL_USER,
  });
});

// if (process.env.NODE_ENV === "production") {
//   console.log("process.env" + process.env.NODE_ENV);
//   app.use(express.static(path.join(__dirname, "../client/dist")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../client/dist/index.html"));
//   });
// }

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
