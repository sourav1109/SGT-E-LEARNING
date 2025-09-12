import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const DeanAnalytics = () => {
  // Sample data - in real implementation, fetch from backend
  const departmentData = [
    { name: 'Computer Science', teachers: 15, courses: 25, students: 450 },
    { name: 'Mathematics', teachers: 12, courses: 18, students: 320 },
    { name: 'Physics', teachers: 10, courses: 15, students: 280 },
    { name: 'Chemistry', teachers: 8, courses: 12, students: 240 }
  ];

  const performanceData = [
    { name: 'Excellent', value: 35, color: '#4caf50' },
    { name: 'Good', value: 40, color: '#2196f3' },
    { name: 'Average', value: 20, color: '#ff9800' },
    { name: 'Poor', value: 5, color: '#f44336' }
  ];

  const enrollmentTrend = [
    { month: 'Jan', students: 1200 },
    { month: 'Feb', students: 1250 },
    { month: 'Mar', students: 1300 },
    { month: 'Apr', students: 1280 },
    { month: 'May', students: 1350 },
    { month: 'Jun', students: 1420 }
  ];

  const MetricCard = ({ title, value, change, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" sx={{ color: change > 0 ? '#4caf50' : '#f44336' }}>
            {change > 0 ? '+' : ''}{change}% from last month
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        School Analytics
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Students"
            value="1,420"
            change={8.2}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Faculty Members"
            value="45"
            change={2.1}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Courses"
            value="70"
            change={5.5}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Departments"
            value="4"
            change={0}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Department Comparison */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Department Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="teachers" fill="#1976d2" name="Teachers" />
                  <Bar dataKey="courses" fill="#2e7d32" name="Courses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Performance Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Enrollment Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Student Enrollment Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="students" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Progress */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Department Progress
              </Typography>
              <Grid container spacing={2}>
                {departmentData.map((dept, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {dept.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {dept.students} students • {dept.teachers} teachers
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(dept.students / 500) * 100}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DeanAnalytics;
