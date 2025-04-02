import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Container,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  Send as SendIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  UploadFile as UploadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";

const InputBox = ({
  isConnected,
  recording,
  startRecording,
  stopRecording,
  selectedDeviceId,
  setSelectedDeviceId,
  audioDevices = [],

  handleInputSubmit,
}) => {
  const [images, setImages] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef(null);
  const historyRef = useRef([""]);
  const undoIndexRef = useRef(0);

  const saveToHistory = (newText) => {
    const history = historyRef.current;
    const currentIndex = undoIndexRef.current;

    if (history[currentIndex] !== newText) {
      // Add new entry & update undo index
      historyRef.current = [...history.slice(0, currentIndex + 1), newText];
      undoIndexRef.current = historyRef.current.length - 1;
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    saveToHistory(value);
    setInputText(value);
  };

  const handleTextPaste = (e) => {
    e.preventDefault(); // Prevents auto-insert from browser
    const pastedText = e.clipboardData.getData("text");
    if (pastedText) {
      const newValue = inputText + pastedText.trim();
      saveToHistory(newValue);
      setInputText(newValue);
    }
  };

  const handleKeyDown = (e) => {
    const isUndoShortcut = (e.ctrlKey || e.metaKey) && e.key === "z"; // Ctrl (Win) or Cmd (Mac)

    if (isUndoShortcut) {
      e.preventDefault();
      if (undoIndexRef.current > 0) {
        undoIndexRef.current -= 1;
        setInputText(historyRef.current[undoIndexRef.current] || "");
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit(e, inputText, images);
      setInputText("");
      setImages([]);
      historyRef.current = [""]; // Reset history after submit
      undoIndexRef.current = 0;
    }
  };

  // Handle file drop
  const { getRootProps, getInputProps } = useDropzone({
    accept: "image/*",
    multiple: true, // Allow multiple images
    noClick: true,
    onDrop: (acceptedFiles) => {
      if (isConnected) {
        const newImages = acceptedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
        setImages((prev) => [...prev, ...newImages]);
      }
    },
  });

  // Handle file selection manually
  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newFiles]);
  };

  // Handle image paste
  const handlePaste = (event) => {
    event.preventDefault();
    if (isConnected) {
      const items = event.clipboardData.items;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && file.type.startsWith("image/")) {
            setImages((prev) => [
              ...prev,
              { file, preview: URL.createObjectURL(file) },
            ]);
          }
        }
      }
    }
  };

  // Remove an image
  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        handleInputSubmit(e, inputText, images);
        setInputText("");
        setImages([]);
      }}
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "100%",
            padding: 2,
            border: "1px solid #c3c3c3",
            borderRadius: 2,
          }}
        >
          <Box
            {...getRootProps()}
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              // padding: 1,
              borderRadius: 2,
            }}
            onPaste={handlePaste}
          >
            <input {...getInputProps()} hidden />
            <TextField
              fullWidth
              multiline
              variant="standard"
              value={inputText}
              onChange={handleChange}
              placeholder="Ask your question... (Drag & Drop, Copy-Paste, or Upload an Image)"
              sx={{
                mr: 1,
                "& .MuiInput-underline:before": {
                  borderBottom: "none !important",
                },
                "& .MuiInput-underline:hover:before": {
                  borderBottom: "none !important",
                },
                "& .MuiInput-underline:after": {
                  borderBottom: "none !important",
                },
              }}
              disabled={!isConnected}
              minRows={1}
              maxRows={6}
              onKeyDown={handleKeyDown}
              onPaste={handleTextPaste}
            />

            <IconButton color="primary" type="submit" disabled={!isConnected}>
              <SendIcon />
            </IconButton>

            <Box>
              <IconButton
                color="primary"
                onClick={() => {
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();
                }}
                disabled={!isConnected}
              >
                <UploadIcon />
              </IconButton>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                hidden
              />
            </Box>

            {!recording ? (
              <IconButton
                color="secondary"
                onClick={startRecording}
                disabled={!isConnected}
              >
                <MicIcon />
              </IconButton>
            ) : (
              <IconButton color="error" onClick={stopRecording}>
                <StopIcon />
              </IconButton>
            )}
          </Box>

          {/* Image Preview Section */}
          {images.length > 0 && (
            <Stack direction="row" spacing={2}>
              {images.map((img, index) => (
                <Stack
                  item
                  key={index}
                  sx={{ position: "relative" }}
                  onClick={() => setImagePreview(img)}
                >
                  <img
                    src={img.preview}
                    alt="Uploaded"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    sx={{
                      position: "absolute",
                      //   top: -5,
                      right: -5,
                      background: "white",
                      padding: 0,
                      "&:hover": { background: "#fff" },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Container>
      <Dialog
        open={imagePreview}
        onClose={() => setImagePreview("")}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            width: "94vw",
            height: "90vh",
          },
        }}
      >
        <IconButton
          onClick={() => setImagePreview("")}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)",
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.8)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent>
          <img
            src={imagePreview.preview}
            alt="Uploaded"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default InputBox;
