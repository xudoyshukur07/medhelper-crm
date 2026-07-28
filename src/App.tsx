import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Visits from './pages/Visits';
import AIDashboard from './pages/AIDashboard';
import Products from './pages/Products';
import Groups from './pages/Groups';
import Sales from './pages/Sales';
import Investments from './pages/Investments';
import Prescriptions from './pages/Prescriptions';
import Plans from './pages/Plans';
import Regions from './pages/Regions';
import ProductGroups from './pages/ProductGroups';
import Districts from './pages/Districts';
import Users from './pages/Users';
import TelegramBot from './pages/TelegramBot';
import Templates from './pages/Templates';
import PrivateRoute from './components/common/PrivateRoute';
import './App.css';
import Roles from './pages/Roles';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="doctors" element={<Doctors />} />
                <Route path="visits" element={<Visits />} />
                <Route path="ai-dashboard" element={<AIDashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="groups" element={<Groups />} />
                <Route path="sales" element={<Sales />} />
                <Route path="investments" element={<Investments />} />
                <Route path="prescriptions" element={<Prescriptions />} />
                <Route path="plans" element={<Plans />} />
                <Route path="regions" element={<Regions />} />
                <Route path="product-groups" element={<ProductGroups />} />
                <Route path="districts" element={<Districts />} />
                <Route path="users" element={<Users />} />
                <Route path="telegram" element={<TelegramBot />} />
                <Route path="templates" element={<Templates />} />
                <Route path="/roles" element={<Roles />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;