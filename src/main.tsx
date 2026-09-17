import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// StrictMode намеренно не используется: в режиме разработки он монтирует
// приложение дважды, из-за чего очередь уведомлений читалась бы двумя циклами.
const container = document.getElementById('root');
if (!container) throw new Error('Не найден контейнер #root');

createRoot(container).render(<App />);
