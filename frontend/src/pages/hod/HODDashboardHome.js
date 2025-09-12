import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button
} from '@mui/material';
import {
  Group as GroupIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const HODDashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    department: null,
    school: null,
    teachers: 0,
    courses: 0,
    students: 0
  });
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get HOD's department info
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const departmentId = userRes.data.department;
      
      if (departmentId) {
        // Get department details
        const deptRes = await axios.get(`/api/departments/${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get school details
        const schoolRes = await axios.get(`/api/schools/${deptRes.data.school}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get teachers in this department
        const teacherRes = await axios.get(`/api/admin/teachers?department=${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get courses in this department
        const courseRes = await axios.get(`/api/admin/courses?department=${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          department: deptRes.data,
          school: schoolRes.data,
          teachers: teacherRes.data.length,
          courses: courseRes.data.length,
          students: 0 // TODO: Implement student count
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, description }) => (
    <Card sx={{ 
      height: '100%', 
      background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
      border: `1px solid ${color}30`
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: `${color}20`,
            color: color,
            mr: 2
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color }}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {description && (
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back, HOD {currentUser.firstName} {currentUser.lastName}
        </Typography>
        {stats.department && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" color="textSecondary">
              {stats.department.name}
            </Typography>
            <Chip 
              label={stats.department.code} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
            {stats.school && (
              <Typography variant="body2" color="textSecondary">
                • {stats.school.name}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Teachers"
            value={stats.teachers}
            icon={<GroupIcon />}
            color="#2e7d32"
            description="Department faculty"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Courses"
            value={stats.courses}
            icon={<BookIcon />}
            color="#ed6c02"
            description="Active courses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Assignments"
            value="24"
            icon={<AssignmentIcon />}
            color="#1976d2"
            description="This month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Performance"
            value="85%"
            icon={<TrendingUpIcon />}
            color="#9c27b0"
            description="Department avg"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" fullWidth>
                  Manage Teachers
                </Button>
                <Button variant="outlined" fullWidth>
                  View Courses
                </Button>
                <Button variant="outlined" fullWidth>
                  Department Analytics
                </Button>
                <Button variant="outlined" fullWidth>
                  Create Announcement
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Department Information
              </Typography>
              {stats.department ? (
                <Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Department:</strong> {stats.department.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Code:</strong> {stats.department.code}
                  </Typography>
                  {stats.school && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>School:</strong> {stats.school.name}
                    </Typography>
                  )}
                  {stats.department.description && (
                    <Typography variant="body2" color="textSecondary">
                      {stats.department.description}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography color="textSecondary">
                  No department assigned to your account.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HODDashboardHome;
