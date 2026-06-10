import { app } from './app';
import { connectDB } from './database/connection';
import { config } from './config';

const PORT = config.PORT;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running in ${config.NODE_ENV} mode on port ${PORT}`);
  });
}

startServer();
