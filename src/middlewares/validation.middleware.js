import Joi from "joi";

// Password validation regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Validation schemas
export const signupSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email":
        "Please provide a valid email address (e.g., user@example.com)",
      "any.required": "Email is required",
    }),

  password: Joi.string().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character (!@#$%^&*)",
    "any.required": "Password is required",
  }),

  name: Joi.string().min(3).max(20).required().messages({
    "string.min": "Display name must be at least 3 characters",
    "string.max": "Display name cannot exceed 20 characters",
    "any.required": "Display name is required",
  }),

  age: Joi.number().integer().min(10).max(100).optional().messages({
    "number.min": "Age must be between 10 and 100",
    "number.max": "Age must be between 10 and 100",
    "number.integer": "Age must be a valid number",
  }),

  gender: Joi.string()
    .valid("Male", "Female", "Prefer not to say", "Other")
    .optional()
    .messages({
      "any.only":
        "Gender must be one of: Male, Female, Prefer not to say, Other",
    }),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .optional()
    .messages({
      "any.only":
        "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
    }),

  role: Joi.string()
    .valid("user", "admin")
    .default("user")
    .optional()
    .messages({
      "any.only": "Role must be either 'user' or 'admin'",
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const profileSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),

  age: Joi.number().integer().min(10).max(100).required().messages({
    "number.min": "Age must be between 10 and 100",
    "number.max": "Age must be between 10 and 100",
    "number.integer": "Age must be a valid number",
    "any.required": "Age is required",
  }),

  gender: Joi.string()
    .valid("Male", "Female", "Prefer not to say", "Other")
    .required()
    .messages({
      "any.only":
        "Gender must be one of: Male, Female, Prefer not to say, Other",
      "any.required": "Gender is required",
    }),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .required()
    .messages({
      "any.only":
        "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
      "any.required": "Blood group is required",
    }),
});

export const passwordResetSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
});

export const socialLoginSchema = Joi.object({
  idToken: Joi.string().required().messages({
    "any.required": "ID token is required",
  }),
});

// Validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};
