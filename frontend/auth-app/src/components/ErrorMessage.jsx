import React from "react";

const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="notification is-danger">
      {Array.isArray(message) ? (
        <ul>
          {message.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
};


export default ErrorMessage;