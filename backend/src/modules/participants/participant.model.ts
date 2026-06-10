import { Schema, model, Document, Types } from 'mongoose';

export interface IParticipant extends Document {
  quizId: Types.ObjectId;
  userId: Types.ObjectId;
  assignedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Unique index to prevent duplicate assignment
ParticipantSchema.index({ quizId: 1, userId: 1 }, { unique: true });

export const ParticipantModel = model<IParticipant>('Participant', ParticipantSchema);
export default ParticipantModel;
