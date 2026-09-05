import app from "./src/app.mjs";

const PORT = Number(process.env.PORT)  || 3005;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

  