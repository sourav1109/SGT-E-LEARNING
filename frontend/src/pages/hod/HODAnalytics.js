import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const HODAnalytics = () => {
  // Sample data - in real implementation, fetch from backend
  const coursePerformance = [
    { name: 'Data Structures', completion: 85, students: 45, avg_score: 78 },
    { name: 'Algorithms', completion: 92, students: 38, avg_score: 82 },
    { name: 'Database Systems', completion: 88, students: 42, avg_score: 76 },
    { name: 'Web Development', completion: 90, students: 50, avg_score: 80 }
  ];

  const teacherPerformance = [
    { name: 'Prof. Smith', courses: 3, students: 120, rating: 4.5 },
    { name: 'Dr. Johnson', courses: 2, students: 85, rating: 4.2 },
    { name: 'Prof. Davis', courses: 2, students: 95, rating: 4.3 },
    { name: 'Dr. Wilson', courses: 3, students: 110, rating: 4.4 }
  ];

  const monthlyProgress = [
    { month: 'Jan', completion: 65, assignments: 12 },
    { month: 'Feb', completion: 70, assignments: 15 },
    { month: 'Mar', completion: 75, assignments: 18 },
    { month: 'Apr', completion: 78, assignments: 16 },
    { month: 'May', completion: 82, assignments: 20 },
    { month: 'Jun', completion: 85, assignments: 22 }
  ];

  const gradeDistribution = [
    { grade: 'A', count: 45, color: '#4caf50' },
    { grade: 'B', count: 65, color: '#2196f3' },
    { grade: 'C', count: 35, color: '#ff9800' },
    { grade: 'D', count: 15, color: '#f44336' },
    { grade: 'F', count: 5, color: '#9e9e9e' }
  ];

  const MetricCard = ({ title, value, subtitle, color, progress }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Department Analytics
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Students"
            value="410"
            subtitle="Across all courses"
            color="#1976d2"
            progress={82}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Faculty"
            value="12"
            subtitle="Active teachers"
            color="#2e7d32"
            progress={95}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Courses"
            value="24"
            subtitle="This semester"
            color="#ed6c02"
            progress={88}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Performance"
            value="79%"
            subtitle="Department average"
            color="#9c27b0"
            progress={79}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Course Performance */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Course Performance Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion" fill="#1976d2" name="Completion %" />
                  <Bar dataKey="avg_score" fill="#2e7d32" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Grade Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Grade Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ grade, count }) => `${grade}: ${count}`}
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Progress */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Monthly Progress Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completion" stroke="#1976d2" name="Completion %" />
                  <Line type="monotone" dataKey="assignments" stroke="#ed6c02" name="Assignments" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Teacher Performance */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Teacher Performance
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Teacher</strong></TableCell>
                      <TableCell><strong>Rating</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherPerformance.map((teacher, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {teacher.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {teacher.courses} courses • {teacher.students} students
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${teacher.rating}/5.0`}
                            size="small"
                            color={teacher.rating >= 4.5 ? "success" : teacher.rating >= 4.0 ? "primary" : "warning"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HODAnalytics;
