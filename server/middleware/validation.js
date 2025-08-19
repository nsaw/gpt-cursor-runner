const { body, validationResult } = require("express-validator");

// Common validation rules
const commonValidations = [
  body("userId").optional().isString().trim().isLength({ min: 1 }),
  body("command").optional().isString().trim().isLength({ min: 1 }),
  body("data").optional().isObject(),
];

// Webhook validation
const webhookValidations = [
  body("type").isString().trim().notEmpty(),
  body("event").isObject(),
  body("timestamp").isISO8601(),
];

// API validation
const apiValidations = [
  body("action").isString().trim().notEmpty(),
  body("payload").optional().isObject(),
];

// Slack validation
const slackValidations = [
  body("payload").optional().isString(),
  body("type").optional().isString(),
  body("event").optional().isObject(),
];

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

module.exports = {
  commonValidations,
  webhookValidations,
  apiValidations,
  slackValidations,
  validate,
};
