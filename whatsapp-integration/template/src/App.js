import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <img src={logo} className="w-20 h-20 mx-auto mb-4 animate-spin" alt="logo" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Tailwind CSS Test
        </h1>
        <p className="text-gray-600 text-center mb-6">
          This should have proper Tailwind styling!
        </p>
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
          Learn React
        </button>
      </div>
    </div>
  );
}

export default App;
