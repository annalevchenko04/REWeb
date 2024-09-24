// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import necessary router components
import Register from './components/Register.jsx';
import Header from './components/Header.jsx';
import Login from './components/Login.jsx';
import { useContext } from 'react';
import { UserContext } from './context/UserContext';
import logo from './38757.png';

const App = () => {
  const [token] = useContext(UserContext);

  return (
      <div>
        <Header title={"RealEstateWeb"} />


          <div className="columns">
              <div className="column">
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>

              </div>
              <div className="column m-5 is-two-thirds">
                  {!token ? (
                      <Routes>
                          <Route path="/" element={<Register/>}/>
                          <Route path="/login" element={<Login/>}/>
                      </Routes>
                  ) : (
                      <p>Welcome back!</p>
                  )}
              </div>

              <div className="column">
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
                  <img src={logo} alt="Real Estate Logo" width="500" height="100"/>
              </div>
          </div>
      </div>
  );
};

export default App;
