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
  School as SchoolIcon,
  Group as GroupIcon,
  Book as BookIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const DeanDashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    school: null,
    departments: 0,
    teachers: 0,
    courses: 0,
    students: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get dean's school info
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const schoolId = userRes.data.school;
      
      if (schoolId) {
        // Get school details
        const schoolRes = await axios.get(`/api/schools/${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get departments in this school
        const deptRes = await axios.get(`/api/departments?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get teachers in this school
        const teacherRes = await axios.get(`/api/admin/teachers?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get courses in this school
        const courseRes = await axios.get(`/api/admin/courses?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          school: schoolRes.data,
          departments: deptRes.data.length,
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
          Welcome back, Dean {currentUser.firstName} {currentUser.lastName}
        </Typography>
        {stats.school && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="textSecondary">
              {stats.school.name}
            </Typography>
            <Chip 
              label={stats.school.code} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Departments"
            value={stats.departments}
            icon={<SchoolIcon />}
            color="#1976d2"
            description="Active departments"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Teachers"
            value={stats.teachers}
            icon={<GroupIcon />}
            color="#2e7d32"
            description="Faculty members"
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
            title="Growth"
            value="+12%"
            icon={<TrendingUpIcon />}
            color="#9c27b0"
            description="This semester"
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
                  View All Departments
                </Button>
                <Button variant="outlined" fullWidth>
                  Manage Teachers
                </Button>
                <Button variant="outlined" fullWidth>
                  Course Overview
                </Button>
                <Button variant="outlined" fullWidth>
                  Analytics Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                School Information
              </Typography>
              {stats.school ? (
                <Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Name:</strong> {stats.school.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Code:</strong> {stats.school.code}
                  </Typography>
                  {stats.school.description && (
                    <Typography variant="body2" color="textSecondary">
                      {stats.school.description}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography color="textSecondary">
                  No school assigned to your account.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DeanDashboardHome;
