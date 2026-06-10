import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from './config';
import UserModel from './modules/users/user.model';
import QuizModel from './modules/quizzes/quiz.model';
import QuestionModel from './modules/questions/question.model';
import ParticipantModel from './modules/participants/participant.model';
import AttemptModel from './modules/attempts/attempt.model';

const BCRYPT_SALT_ROUNDS = 12;

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to database. Seeding data...');

    // 1. Clear existing collections
    await UserModel.deleteMany({});
    await QuizModel.deleteMany({});
    await QuestionModel.deleteMany({});
    await ParticipantModel.deleteMany({});
    await AttemptModel.deleteMany({});
    console.log('Cleared existing collections.');

    // 2. Create Users
    const passwordHash = await bcrypt.hash('Password123', BCRYPT_SALT_ROUNDS);

    await UserModel.create({
      name: 'System Admin',
      email: 'admin@quizarena.com',
      passwordHash,
      role: 'admin',
      status: 'active',
    });

    const instructor = await UserModel.create({
      name: 'Priya Sharma',
      email: 'priya@quizarena.com',
      passwordHash,
      role: 'instructor',
      status: 'active',
    });

    const candidate1 = await UserModel.create({
      name: 'Sara Rauf',
      email: 'sara@quizarena.com',
      passwordHash,
      role: 'candidate',
      status: 'active',
    });

    const candidate2 = await UserModel.create({
      name: 'Rohan Verma',
      email: 'rohan@quizarena.com',
      passwordHash,
      role: 'candidate',
      status: 'active',
    });

    console.log('Users created: Admin, Instructor (Priya), Candidates (Sara, Rohan).');

    // 3. Create Quizzes
    const now = new Date();

    const quizCompleted = await QuizModel.create({
      title: 'CSS Advanced Selectors',
      description: 'Test your advanced knowledge of combinators, pseudo-classes, and specificity calculations.',
      instructorId: instructor._id,
      questionType: 'single',
      duration: 10,
      status: 'Completed',
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    });

    const quizLive = await QuizModel.create({
      title: 'React Hook Mechanics',
      description: 'Proctored quiz evaluating understanding of useEffect, useCallback dependency arrays, and custom hooks.',
      instructorId: instructor._id,
      questionType: 'single',
      duration: 15,
      status: 'Live',
      startTime: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
      endTime: new Date(now.getTime() + 55 * 60 * 1000), // 55 mins from now
    });

    const quizScheduled = await QuizModel.create({
      title: 'NodeJS Event Loop',
      description: 'Overview of macro and microtask queues, process.nextTick, and libuv threadpool behaviors.',
      instructorId: instructor._id,
      questionType: 'single',
      duration: 20,
      status: 'Scheduled',
      startTime: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
      endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
    });

    await QuizModel.create({
      title: 'TypeScript Generic Constraints',
      description: 'Draft quiz for evaluating advanced generic types and conditional constraints.',
      instructorId: instructor._id,
      questionType: 'single',
      duration: 30,
      status: 'Draft',
    });

    console.log('Quizzes created: CSS (Completed), React (Live), Node (Scheduled), TS (Draft).');

    // 4. Create Questions
    // CSS Questions (5 questions)
    const cssQ1 = await QuestionModel.create({
      quizId: quizCompleted._id,
      question: 'Which selector matches an element that is the first child of its parent?',
      options: [':first-of-type', ':first-child', ':only-child', ':nth-child(0)'],
      correctAnswers: [1], // :first-child
    });

    const cssQ2 = await QuestionModel.create({
      quizId: quizCompleted._id,
      question: 'What is the specificity value of a single ID selector in CSS?',
      options: ['0,1,0,0', '0,0,1,0', '0,0,0,1', '1,0,0,0'],
      correctAnswers: [0], // 0,1,0,0
    });

    const cssQ3 = await QuestionModel.create({
      quizId: quizCompleted._id,
      question: 'Which combinator represents the adjacent sibling selector in CSS?',
      options: ['>', ' ', '+', '~'],
      correctAnswers: [2], // +
    });

    await QuestionModel.create({
      quizId: quizLive._id,
      question: 'Which React Hook is primarily used to return a memoized version of a callback function?',
      options: ['useMemo', 'useCallback', 'useRef', 'useEffect'],
      correctAnswers: [1], // useCallback
    });

    await QuestionModel.create({
      quizId: quizLive._id,
      question: 'When does the cleanup function of a useEffect hook run?',
      options: [
        'Only when the component unmounts',
        'Right before the effect runs again, and when the component unmounts',
        'After every render cycle',
        'Only when dependencies array is empty'
      ],
      correctAnswers: [1],
    });

    await QuestionModel.create({
      quizId: quizLive._id,
      question: 'How do you persist values across render cycles in React without triggering a re-render?',
      options: ['useState', 'useReducer', 'useRef', 'useContext'],
      correctAnswers: [2], // useRef
    });

    console.log('Questions created for CSS and React hooks quizzes.');

    // 5. Enroll Participants (Sara and Rohan)
    await ParticipantModel.create([
      { quizId: quizCompleted._id, userId: candidate1._id },
      { quizId: quizCompleted._id, userId: candidate2._id },
      { quizId: quizLive._id, userId: candidate1._id },
      { quizId: quizLive._id, userId: candidate2._id },
      { quizId: quizScheduled._id, userId: candidate1._id },
    ]);

    console.log('Participants enrolled.');

    // 6. Create Attempts (for completed quiz)
    // Sara Rauf got 2/3
    const answersSara = new Map<string, number[]>();
    answersSara.set(cssQ1._id.toString(), [1]); // Correct
    answersSara.set(cssQ2._id.toString(), [1]); // Incorrect (should be 0)
    answersSara.set(cssQ3._id.toString(), [2]); // Correct

    await AttemptModel.create({
      quizId: quizCompleted._id,
      candidateId: candidate1._id,
      startedAt: new Date(now.getTime() - 110 * 60 * 1000), // 1h10m ago
      submittedAt: new Date(now.getTime() - 105 * 60 * 1000),
      answers: answersSara,
      score: 2,
      timeTaken: 300, // 5 mins
      status: 'Submitted',
    });

    // Rohan Verma got 1/3
    const answersRohan = new Map<string, number[]>();
    answersRohan.set(cssQ1._id.toString(), [0]); // Incorrect
    answersRohan.set(cssQ2._id.toString(), [1]); // Incorrect
    answersRohan.set(cssQ3._id.toString(), [2]); // Correct

    await AttemptModel.create({
      quizId: quizCompleted._id,
      candidateId: candidate2._id,
      startedAt: new Date(now.getTime() - 115 * 60 * 1000),
      submittedAt: new Date(now.getTime() - 107 * 60 * 1000),
      answers: answersRohan,
      score: 1,
      timeTaken: 480, // 8 mins
      status: 'Submitted',
    });

    console.log('Completed attempts seeded for CSS quiz.');

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seed();
