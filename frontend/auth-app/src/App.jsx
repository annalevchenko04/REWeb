import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Import necessary router components
import Register from './components/Register.jsx';
import Header from './components/Header.jsx';
import Login from './components/Login.jsx';
import Table from './components/Table.jsx';
import Footer from './components/Footer';
import MyFavorites from './components/MyFavorites';
import PropertySearch from './components/PropertySearch.jsx'; // Import your new component
import PropertyDetails from './components/PropertyDetails.jsx'; // Import your property details component
import { useContext } from 'react';
import { UserContext } from './context/UserContext';
import AgentVisitRequests from './components/AgentVisitRequests'; // Import your AgentVisitRequests component
import UserVisitRequests from './components/UserVisitRequests'; // Import your UserVisitRequests component
import logo from './38757.png';

const App = () => {
  const [token] = useContext(UserContext);

  return (
    <div className="app-container">
      <Header title={"RealEstateWeb"} />

      <div className="columns is-mobile" style={{ display: 'flex', alignItems: 'flex-start' }}> {/* Add 'is-mobile' for better responsiveness */}
        <div className="column is-flex is-justify-content-center"> {/* Center the images */}
          <div>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
          </div>
        </div>

        <div className="column is-two-thirds"> {/* Use a two-thirds width for the main content */}
          <Routes>
            {/* Routes for unauthenticated users */}
            {!token ? (
              <>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
              </>
            ) : (
              <>
                {/* Routes for authenticated users */}
                <Route path="/profile" element={<Table />} />
                <Route path="/properties/search" element={<PropertySearch />} />
                <Route path="/property/:property_id" element={<PropertyDetails />} />
                <Route path="/users/:userId/my-favorites" element={<MyFavorites />} />
                <Route path="/users/:user_id/agent-visit-requests" element={<AgentVisitRequests />} />
                <Route path="/users/:user_id/visit-requests" element={<UserVisitRequests />} />

              </>
            )}
          </Routes>
        </div>

        <div className="column is-flex is-justify-content-center"> {/* Center the images */}
          <div>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
            <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default App;
