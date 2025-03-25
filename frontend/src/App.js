import React, { useState, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import {
  Send as SendIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const messagesEndRef = useRef(null);
  const isPrimaryUser = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(audioInputDevices);
        if (audioInputDevices.length > 0) {
          setSelectedDeviceId(audioInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }

      const urlParams = new URLSearchParams(window.location.search);
      let sessionIdFromUrl = urlParams.get("sessionId");

      if (!sessionIdFromUrl) {
        const response = await fetch("http://localhost:8001/start-session", {
          method: "POST",
        });
        const data = await response.json();
        sessionIdFromUrl = data.sessionId;
        window.history.replaceState(null, null, `?sessionId=${sessionIdFromUrl}`);
        isPrimaryUser.current = true;
      }

      setSessionId(sessionIdFromUrl);
      setupWebSocket(sessionIdFromUrl);
    };

    initializeSession();
  }, []);

  const setupWebSocket = (sessId) => {
    const websocket = new WebSocket(`ws://localhost:8001/ws/${sessId}`);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      const messageData = JSON.parse(event.data);
      
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        
        if (
            lastMessage &&
            lastMessage.role === "assistant" &&
            messageData.role === "assistant" &&
            !lastMessage.is_complete
          )  {
            return [...prevMessages.slice(0, -1), messageData];
        }
        const isDuplicate = prevMessages.some(msg => 
            msg.role === messageData.role &&
            msg.content === messageData.content &&
            msg.is_audio === messageData.is_audio &&
            msg.is_complete === messageData.is_complete
          );

        if (isDuplicate) {
            return prevMessages;
          }
        return [...prevMessages, messageData];
      });
    };

    websocket.onclose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    setSocket(websocket);
  };

  const handleInputSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("message", userMessage);

      await fetch("http://localhost:8001/send-message", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAudioMessage = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("file", audioBlob, "audio.wav");

      await fetch("http://localhost:8001/ask-audio", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  };

  const startRecording = async () => {
    try {
      const constraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const recorder = new MediaRecorder(mediaStream);
      setStream(mediaStream);
      setMediaRecorder(recorder);

      const audioChunks = [];
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        await handleAudioMessage(audioBlob);
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Mic error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
      setMediaRecorder(null);
    }
  };

  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Interview Assistant
          </Typography>
          <Typography
            variant="body2"
            sx={{ mr: 2, color: isConnected ? "lightgreen" : "orange" }}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Typography>
          <Button color="inherit" startIcon={<ShareIcon />} onClick={() => setShareDialogOpen(true)}>
            Share
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, backgroundColor: "#f0f0f0" }}>
        <Container maxWidth="md">
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: msg.role === "user" ? "#daf1e0" : "#fff",
                  maxWidth: "100%",
                  width: "fit-content",
                  boxShadow: 1,
                  overflowWrap: "break-word",
                }}
              >
                {msg.is_audio ? (
                  <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                    [Audio Message]
                  </Typography>
                ) : msg.role === "assistant" ? (
                  <ReactMarkdown components={components}>{msg.content}</ReactMarkdown>
                ) : (
                  <Typography variant="body1">{msg.content}</Typography>
                )}
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Container>
      </Box>

      <Box
        component="form"
        onSubmit={handleInputSubmit}
        sx={{ p: 2, backgroundColor: "#fff" }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <FormControl sx={{ minWidth: 150, mr: 2 }}>
              <InputLabel id="device-select-label">Audio Input</InputLabel>
                            <Select
                              labelId="device-select-label"
                              id="device-select"
                              label="Audio Input"
                              value={selectedDeviceId}
                              onChange={(e) => setSelectedDeviceId(e.target.value)}
                            >
                              {audioDevices.map((device) => (
                                <MenuItem key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Device ${device.deviceId}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
              
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask your question..."
                            sx={{ mr: 1 }}
                            disabled={!isConnected}
                          />
                          <IconButton color="primary" type="submit" disabled={!isConnected}>
                            <SendIcon />
                          </IconButton>
                          {!recording ? (
                            <IconButton
                              color="secondary"
                              onClick={startRecording}
                              disabled={!isConnected || !selectedDeviceId}
                            >
                              <MicIcon />
                            </IconButton>
                          ) : (
                            <IconButton color="error" onClick={stopRecording}>
                              <StopIcon />
                            </IconButton>
                          )}
                        </Box>
                      </Container>
                    </Box>
              
                    <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
                      <DialogTitle>Share this Chat</DialogTitle>
                      <DialogContent>
                        <Typography>Share this link:</Typography>
                        <Box
                          sx={{
                            mt: 2,
                            p: 1,
                            backgroundColor: "#f0f0f0",
                            borderRadius: 1,
                            wordBreak: "break-all",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Typography sx={{ flexGrow: 1 }}>
                            {`${window.location.origin}?sessionId=${sessionId}`}
                          </Typography>
                          <IconButton
                            onClick={() =>
                              navigator.clipboard.writeText(
                                `${window.location.origin}?sessionId=${sessionId}`
                              )
                            }
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
                      </DialogActions>
                    </Dialog>
                  </Box>
                );
              };
              
              export default App;
              