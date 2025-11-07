export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongodb duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate entry";
  }

  // Mongodb validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

