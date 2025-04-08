import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import TextareaAutosize from "@mui/material/TextareaAutosize";

const JobInput = () => {
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [behavior, setBehavior] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ jobRole, jobDescription, behavior });
    // Add your submit logic here
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Job Details
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          label="Job Role"
          fullWidth
          margin="normal"
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          required
        />

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Job Description
          </Typography>
          <TextareaAutosize
            minRows={12}
            placeholder="Enter job description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{
              width: "100%", // or any fixed width like "400px"
              maxWidth: "100%",
              minWidth: "500px",
              padding: "12px",
              fontFamily: "inherit",
              fontSize: "16px",
              borderColor: "#ccc",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
            required
          />
        </Box>

        <FormControl fullWidth margin="normal" required>
          <InputLabel>Behavior</InputLabel>
          <Select
            value={behavior}
            label="Behavior"
            onChange={(e) => setBehavior(e.target.value)}
          >
            <MenuItem value="Full-time">Full-time</MenuItem>
            <MenuItem value="Part-time">Part-time</MenuItem>
            <MenuItem value="Contract">Contract</MenuItem>
            <MenuItem value="Internship">Internship</MenuItem>
          </Select>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Submit
        </Button>
      </form>
    </Box>
  );
};

export default JobInput;
