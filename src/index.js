import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, "127.0.0.1", () => {
  console.log(` Eco-Health backend server running on port ${PORT}`);
});
