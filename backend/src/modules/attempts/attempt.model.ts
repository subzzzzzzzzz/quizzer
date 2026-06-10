import { Schema, model, Document, Types } from 'mongoose';

export interface IAttempt extends Document {
  quizId: Types.ObjectId;
  candidateId: Types.ObjectId;
  startedAt: Date;
  submittedAt?: Date;
  answers: Map<string, number[]>; // key: questionId (string), value: selected option indices, e.g. [0]
  score: number; // calculated upon submission, saved permanently
  timeTaken?: number; // time taken in seconds
  status: 'InProgress' | 'Submitted' | 'AutoSubmitted';
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    answers: {
      type: Map,
      of: [Number],
      default: new Map(),
    },
    score: {
      type: Number,
      default: 0,
    },
    timeTaken: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['InProgress', 'Submitted', 'AutoSubmitted'],
      default: 'InProgress',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to restrict to a single attempt per candidate per quiz
AttemptSchema.index({ quizId: 1, candidateId: 1 }, { unique: true });

export const AttemptModel = model<IAttempt>('Attempt', AttemptSchema);
export default AttemptModel;
