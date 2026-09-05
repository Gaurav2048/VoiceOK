import app from "./app.mjs";

app.listen(process.env.PORT || 3005, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

