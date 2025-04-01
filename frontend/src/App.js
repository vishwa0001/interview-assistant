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
  Skeleton,
  // Drawer,
  // TextareaAutosize,
} from "@mui/material";
import {
  Send as SendIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Share as ShareIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  ContentCopy as ContentCopyIcon,
  ReplayRounded as ReplayRoundedIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Login from "./Login";
import InputBox from "./InputBox";

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
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [isloggedIn, setIsloggedIn] = useState(false);
  // const [openDrawer, setOpenDrawer] = useState(false);

  const messagesEndRef = useRef(null);
  const isPrimaryUser = useRef(false);

  useEffect(() => {
    if (localStorage.getItem("Token")) setIsloggedIn(true);
    else setIsloggedIn(false);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (
      messages.length &&
      (messages[messages.length - 1].role !== "assistant" ||
        messages[messages.length - 2].role !== "assistant")
    )
      scrollToBottom();
  }, [messages]);

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
      const response = await fetch(
        "https://interview-assistant.log1.com/start-session",
        {
          method: "POST",
        }
      );
      const data = await response.json();
      sessionIdFromUrl = data.sessionId;
      window.history.replaceState(null, null, `?sessionId=${sessionIdFromUrl}`);
      isPrimaryUser.current = true;
    }

    setSessionId(sessionIdFromUrl);
    setupWebSocket(sessionIdFromUrl);
  };

  useEffect(() => {
    initializeSession();
    //eslint-disable-next-line
  }, []);

  const setupWebSocket = (sessId) => {
    const websocket = new WebSocket(
      `wss://interview-assistant.log1.com/ws/${sessId}`
    );

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
        ) {
          return [...prevMessages.slice(0, -1), messageData];
        }
        if (
          (messageData.is_image &&
            lastMessage.is_image &&
            lastMessage.role === messageData.role) ||
          (lastMessage &&
            lastMessage.content &&
            lastMessage.role === messageData.role &&
            lastMessage.is_complete)
        ) {
          return prevMessages;
        }
        // const isDuplicate = prevMessages.some(
        //   (msg) =>
        //     msg.role === messageData.role &&
        //     msg.content === messageData.content &&
        //     msg.is_audio === messageData.is_audio &&
        //     msg.is_complete === messageData.is_complete
        // );

        // if (isDuplicate) {
        //   return prevMessages;
        // }
        if (messageData.is_image ? true : messageData.content)
          return [...prevMessages, messageData];

        return prevMessages;
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

  const handleInputSubmit = async (e, input, images) => {
    e.preventDefault();
    if (!input.trim() && !images.length) return;

    const userMessage = input.trim();

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("message", userMessage);
      if (images.length) {
        images.forEach((image, index) => {
          formData.append(`files`, image.file);
        });
      }

      await fetch("https://interview-assistant.log1.com/send-message", {
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

      await fetch("https://interview-assistant.log1.com/ask-audio", {
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
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

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
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
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
          {!isConnected && (
            <IconButton
              color="inherit"
              sx={{ mr: 1 }}
              onClick={() => {
                initializeSession();
                scrollToBottom();
              }}
            >
              <ReplayRoundedIcon />
            </IconButton>
          )}
          <Typography
            variant="body2"
            sx={{ mr: 2, color: isConnected ? "lightgreen" : "orange" }}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Typography>
          <Button
            color="inherit"
            sx={{ mr: 1 }}
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
          >
            Share
          </Button>
          {isloggedIn ? (
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={() => {
                localStorage.clear();
                setIsloggedIn(false);
              }}
            >
              Logout
            </Button>
          ) : (
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={() => setLoginDialogOpen(true)}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          backgroundColor: "#f0f0f0",
          position: "relative",
        }}
      >
        {/* <Button
          onClick={() => setOpenDrawer(true)}
          color="secondary"
          variant="outlined"
          sx={{
            position: "fixed",
            top: "70",
            left: "8px",
            backgroundColor: "white",
            boxShadow: 2,
          }}
        >
          Open
        </Button> */}
        <Box sx={{ overflowY: "auto" }}>
          <Container maxWidth="md">
            {messages.length > 0 &&
              messages.map((msg, idx) => (
                <Box
                  key={idx}
                  ref={
                    msg.role !== "assistant" &&
                    (messages.length - 1 === idx || messages.length - 2 === idx)
                      ? messagesEndRef
                      : null
                  }
                  sx={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
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
                    ) : msg.is_image && msg.role !== "assistant" ? (
                      <>
                        <Typography
                          variant="body1"
                          sx={{ fontStyle: "italic" }}
                        >
                          [image]
                        </Typography>
                        {msg.content && (
                          <Typography variant="body1">{msg.content}</Typography>
                        )}
                      </>
                    ) : msg.role === "assistant" ? (
                      <ReactMarkdown components={components}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <Typography variant="body1">{msg.content}</Typography>
                    )}
                  </Box>
                </Box>
              ))}
            {messages.length > 0 &&
              (messages[messages.length - 1].role !== "assistant" ||
                !messages[messages.length - 1].is_complete) && (
                <Box
                  sx={{
                    height: "calc(100vh - 234px)",
                    minHeight: "50px",
                  }}
                >
                  {messages[messages.length - 1].role !== "assistant" && (
                    <Skeleton variant="circular" width={40} height={40} />
                  )}
                </Box>
              )}
            {/* <div ref={messagesEndRef} /> */}
          </Container>
        </Box>
      </Box>

      {isloggedIn && (
        <InputBox
          recording={recording}
          isConnected={isConnected}
          audioDevices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          startRecording={startRecording}
          stopRecording={stopRecording}
          handleInputSubmit={handleInputSubmit}
        />
      )}

      {false && (
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
      )}

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

      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)}>
        <DialogContent>
          <Login
            setIsloggedIn={setIsloggedIn}
            setLoginDialogOpen={setLoginDialogOpen}
          />
        </DialogContent>
      </Dialog>

      {/* <Drawer open={openDrawer} onClose={() => setOpenDrawer(false)}>
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">Some content</Typography>
          <Box>
            <TextareaAutosize minRows={4} />
          </Box>
        </Box>
      </Drawer> */}
    </Box>
  );
};

export default App;
