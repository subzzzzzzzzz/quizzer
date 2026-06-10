import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  quizId: Types.ObjectId;
  question: string;
  options: string[]; // 4 options
  correctAnswers: number[]; // indices of correct answers, e.g. [0] or [0, 2]
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length === 4;
        },
        message: 'A question must have exactly 4 options.',
      },
    },
    correctAnswers: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return v.length >= 1 && v.every(num => num >= 0 && num <= 3);
        },
        message: 'Correct answers must contain valid option indices (0-3).',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const QuestionModel = model<IQuestion>('Question', QuestionSchema);
export default QuestionModel;
