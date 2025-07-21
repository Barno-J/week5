import React, { useState, useEffect, useRef } from "react";
import { 
  FaPaperPlane, 
  FaUser, 
  FaUsers, 
  FaRegSmile,
  FaEllipsisV,
  FaCheckDouble
} from "react-icons/fa";
import socket from "../socket/socket";

const Chat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Set username on first load
  useEffect(() => {
    const storedUsername = localStorage.getItem("chat-username") || 
                          `User${Math.floor(Math.random() * 1000)}`;
    setUsername(storedUsername);
    socket.emit("set-username", storedUsername);
  }, []);

  // Socket event handlers
  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("set-username", username);
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("chat-message", (msg) => {
      setMessages(prev => [...prev, msg]);
      setIsTyping(false);
    });

    socket.on("user-list", (userList) => {
      setUsers(userList);
    });

    socket.on("typing", (user) => {
      if (user !== username) {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 2000);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat-message");
      socket.off("user-list");
      socket.off("typing");
    };
  }, [username]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        text: message,
        user: username,
        timestamp: new Date().toLocaleTimeString(),
        isOwn: true
      };
      socket.emit("chat-message", newMessage);
      setMessages(prev => [...prev, newMessage]);
      setMessage("");
      setTyping(false);
    }
  };

  const handleTyping = () => {
    if (!typing && message) {
      socket.emit("typing", username);
      setTyping(true);
    }
    if (!message) setTyping(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">Socket.IO Chat</h2>
          <span className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowUserModal(!showUserModal)}
            className="flex items-center space-x-1 bg-blue-700 px-3 py-1 rounded"
          >
            <FaUsers />
            <span>{users.length}</span>
          </button>
          <div className="relative">
            <button className="flex items-center space-x-1">
              <FaUser />
              <span>{username}</span>
            </button>
            {showUserModal && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-lg z-10 p-2">
                <div className="p-2 font-semibold border-b">Online Users</div>
                <div className="max-h-60 overflow-y-auto">
                  {users.map((user, i) => (
                    <div key={i} className="p-2 flex items-center">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                      {user}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-xs md:max-w-md rounded-lg p-3 ${msg.isOwn 
                  ? "bg-blue-500 text-white rounded-br-none" 
                  : "bg-white text-gray-800 rounded-bl-none shadow"}`}
              >
                {!msg.isOwn && (
                  <div className="font-semibold text-xs text-blue-600">{msg.user}</div>
                )}
                <div className="py-1">{msg.text}</div>
                <div className={`text-xs flex items-center ${msg.isOwn ? "text-blue-100" : "text-gray-500"}`}>
                  {msg.timestamp}
                  {msg.isOwn && <FaCheckDouble className="ml-1" />}
                </div>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-lg rounded-bl-none shadow p-3">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex items-center space-x-2">
          <button type="button" className="text-gray-500 hover:text-blue-500">
            <FaRegSmile size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button 
            type="submit" 
            disabled={!message.trim()}
            className={`p-2 rounded-full ${message.trim() 
              ? "bg-blue-500 text-white hover:bg-blue-600" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;