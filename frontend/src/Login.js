import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const Login = ({ setIsloggedIn, setLoginDialogOpen }) => {
  const [credentials, setCredentials] = useState({
    employeeId: "",
    password: "",
  });
  const [error, setError] = useState({ employeeId: false, password: false });
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.employeeId || !credentials.password) {
      setError({
        employeeId: !credentials.employeeId,
        password: !credentials.password,
      });
      return;
    }

    setError({ employeeId: false, password: false });
    console.log("Logging in with:", credentials);

    const payload = {
      employee_id: credentials.employeeId,
      fcm_token: "",
      password: credentials.password,
    };

    try {
      const response = await fetch("https://api.log1.com/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(`${data.message}`);
      }

      const data = await response.json();
      if (data.data.roles.includes("interviewee")) {
        localStorage.setItem("Token", data.data.token);
        setIsloggedIn(true);
        setLoginDialogOpen(false);
      } else {
        setAlert({
          open: true,
          message: "Permission denied!",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error logging in:", error.message);
      setAlert({
        open: true,
        message: `${error.message}`,
        severity: "error",
      });
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
      >
        <Typography variant="h5" textAlign="center" mb={2}>
          Login
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Employee ID"
            name="employeeId"
            variant="outlined"
            margin="normal"
            value={credentials.employeeId}
            onChange={handleChange}
            error={error.employeeId}
            helperText={error.employeeId ? "Employee ID is required" : ""}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            margin="normal"
            value={credentials.password}
            onChange={handleChange}
            error={error.password}
            helperText={error.password ? "Password is required" : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            size="large"
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
          >
            Login
          </Button>
        </form>
      </Box>
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
