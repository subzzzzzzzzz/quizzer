import { Schema, model, Document, Types } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description?: string;
  instructorId: Types.ObjectId;
  questionType: 'single' | 'multi';
  duration: number; // in minutes
  status: 'Draft' | 'Scheduled' | 'Live' | 'Completed' | 'Cancelled' | 'Expired';
  startTime?: Date;
  endTime?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionType: {
      type: String,
      enum: ['single', 'multi'],
      default: 'single',
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Live', 'Completed', 'Cancelled', 'Expired'],
      default: 'Draft',
      required: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const QuizModel = model<IQuiz>('Quiz', QuizSchema);
export default QuizModel;
