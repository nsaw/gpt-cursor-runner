import Joi from 'joi';

export const inputSchema = Joi.object({
  userId: Joi.string().required(),
  command: Joi.string().required()
});

export function validate(req, res, next) {
  const result = inputSchema.validate(req.body);
  if (result.error) return res.status(400).send(result.error.details);
  next();
} 