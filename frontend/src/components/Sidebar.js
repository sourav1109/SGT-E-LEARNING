import React from 'react';
import { 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Collapse,
  ListItemButton,
  Box,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Badge
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import { MdClass } from 'react-icons/md';
// import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import ForumIcon from '@mui/icons-material/Forum';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CommentIcon from '@mui/icons-material/Comment';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import FlagIcon from '@mui/icons-material/Flag';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import QuizIcon from '@mui/icons-material/Quiz';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

const Sidebar = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [forumOpen, setForumOpen] = React.useState(false);
  const theme = useTheme();
  
  // Check if the current path includes forum to expand forum section
  React.useEffect(() => {
    if (location.pathname.includes('/forum') || location.pathname.includes('/forums')) {
      setForumOpen(true);
    }
  }, [location.pathname]);
  
  const handleForumClick = () => {
    setForumOpen(!forumOpen);
  };
  
  // Different menus based on user role
  const adminMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: '#4361ee' },
  { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: '#1976d2' },
    { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: '#3a0ca3' },
    { text: 'Students', icon: <SchoolIcon />, path: 'students', color: '#7209b7' },
    { text: 'Courses', icon: <MdClass />, path: 'courses', color: '#f72585' },
    { text: 'Enhanced Analytics', icon: <InsightsIcon />, path: 'enhanced-analytics', color: '#4cc9f0' },
    { 
      text: 'Forum Management', 
      icon: <ForumIcon />, 
      isExpandable: true,
      color: '#ff9e00',
      subItems: [
        { text: 'All Forums', icon: <CommentIcon />, path: 'forum', color: '#ff9e00' },
        { text: 'Course Forums', icon: <QuestionAnswerIcon />, path: 'forum/course-forums', color: '#ff9e00' },
        { text: 'Reported Content', icon: <FlagIcon />, path: 'forum/reported', color: '#ff9e00' }
      ]
    },
    { text: 'Roles', icon: <AdminPanelSettingsIcon />, path: 'roles', color: '#38b000' },
  ];
  
  const teacherMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', permission: null, color: '#4361ee' },
  { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', permission: null, color: '#1976d2' },
    { text: 'My Courses', icon: <MdClass />, path: 'courses', permission: null, color: '#f72585' },
    { text: 'Quizzes', icon: <QuizIcon />, path: 'quizzes', permission: null, color: '#e91e63' },
    { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', permission: 'manage_videos', color: '#7209b7' },
    { 
      text: 'Students', 
      icon: <SchoolIcon />, 
      path: 'students', 
      permission: 'manage_students', 
      color: '#3a0ca3',
      highlight: true 
    },
    { text: 'Forums', icon: <ForumIcon />, path: 'forums', permission: null, color: '#ff9e00' },
    // Only showing the main Analytics Dashboard
    { 
      text: 'Analytics Dashboard', 
      icon: <AssessmentIcon />, 
      path: 'analytics', 
      permission: 'view_analytics', 
      color: '#38b000' 
    }
  ];
  
  const studentMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: '#4361ee' },
  { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: '#1976d2' },
    { text: 'My Courses', icon: <MdClass />, path: 'courses', color: '#f72585' },
    { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', color: '#7209b7' },
    { text: 'Forums', icon: <ForumIcon />, path: 'forums', color: '#ff9e00' },
  ];
  
  // Select menu based on user role
  let menu = [];
  let basePath = '';
  let roleName = '';
  let roleColor = '';
  
  if (currentUser?.role === 'admin') {
    menu = adminMenu;
    basePath = '/admin';
    roleName = 'Administrator';
    roleColor = '#3a0ca3';
  } else if (currentUser?.role === 'teacher') {
    // Filter teacher menu based on permissions
    menu = teacherMenu.filter(item => 
      // Include if permission is null (always show) or user has the permission
      item.permission === null || 
      (currentUser.permissions && hasPermission(currentUser, item.permission))
    );
    basePath = '/teacher';
    roleName = 'Teacher';
    roleColor = '#38b000';
  } else if (currentUser?.role === 'student') {
    menu = studentMenu;
    basePath = '/student';
    roleName = 'Student';
    roleColor = '#4cc9f0';
  }

  // Get initials for the avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <Drawer 
      variant="permanent" 
      sx={{ 
        width: 260, 
        flexShrink: 0, 
        [`& .MuiDrawer-paper`]: { 
          width: 260, 
          boxSizing: 'border-box',
          borderRight: 0,
          boxShadow: '2px 0px 20px rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'
            : 'linear-gradient(180deg, #1c2536 0%, #111827 100%)'
        } 
      }}
    >
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        height: 80,
        display: 'flex',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          SGT Learning
        </Typography>
      </Toolbar>
      
      {/* User profile section */}
      <Box sx={{ 
        p: 2.5, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        mb: 1.5,
        pb: 2.5,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)'
      }}>
        <Avatar 
          sx={{ 
            width: 70, 
            height: 70, 
            bgcolor: roleColor,
            mb: 1.5,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
            border: '3px solid white'
          }}
        >
          {getInitials(currentUser?.name || currentUser?.email)}
        </Avatar>
        <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#333', mb: 0.5 }}>
          {currentUser?.name || currentUser?.email}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'white',
            bgcolor: roleColor,
            px: 2,
            py: 0.5,
            borderRadius: 5,
            mt: 0.5,
            fontWeight: 500,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {roleName}
        </Typography>
      </Box>
      
      <List sx={{ px: 1 }}>
        {menu.map((item, index) => (
          item.isExpandable ? (
            <React.Fragment key={item.text}>
              <ListItemButton 
                onClick={handleForumClick}
                sx={{ 
                  my: 0.5,
                  borderRadius: 2,
                  py: 1.2,
                  transition: 'all 0.25s ease-in-out',
                  '&:hover': {
                    bgcolor: alpha(item.color, 0.1),
                    transform: 'translateX(4px)',
                    boxShadow: `0 4px 12px ${alpha(item.color, 0.15)}`
                  },
                  ...(forumOpen && {
                    bgcolor: alpha(item.color, 0.12),
                    borderLeft: `4px solid ${item.color}`,
                    pl: 1.5
                  })
                }}
              >
                <ListItemIcon sx={{ 
                  color: forumOpen ? item.color : 'inherit',
                  minWidth: 40,
                  transition: 'transform 0.2s ease',
                  transform: forumOpen ? 'scale(1.1)' : 'scale(1)'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: forumOpen ? 600 : 400,
                    color: forumOpen ? item.color : 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                />
                {forumOpen ? 
                  <ExpandLess sx={{ color: item.color, transition: 'transform 0.3s ease', transform: 'scale(1.2)' }} /> : 
                  <ExpandMore sx={{ transition: 'transform 0.3s ease' }} />
                }
              </ListItemButton>
              <Collapse in={forumOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 1.5 }}>
                  {item.subItems.map((subItem) => {
                    const isSelected = location.pathname === `${basePath}/${subItem.path}`;
                    
                    return (
                      <ListItemButton 
                        key={subItem.text} 
                        sx={{ 
                          pl: 4,
                          py: 0.8,
                          my: 0.5,
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          ...(isSelected && {
                            bgcolor: alpha(subItem.color, 0.15),
                            '&:hover': {
                              bgcolor: alpha(subItem.color, 0.2),
                            },
                            borderRight: `3px solid ${subItem.color}`,
                            boxShadow: `0 2px 8px ${alpha(subItem.color, 0.2)}`
                          }),
                          '&:hover': {
                            bgcolor: alpha(subItem.color, 0.1),
                            transform: 'translateX(4px)'
                          }
                        }}
                        onClick={() => navigate(`${basePath}/${subItem.path}`)}
                      >
                        <ListItemIcon sx={{ 
                          color: isSelected ? subItem.color : 'inherit',
                          minWidth: 30,
                          fontSize: '0.9rem',
                          transition: 'transform 0.2s ease',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                        }}>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.text} 
                          primaryTypographyProps={{ 
                            fontWeight: isSelected ? 600 : 400,
                            fontSize: '0.9rem',
                            color: isSelected ? subItem.color : 'inherit',
                            transition: 'color 0.2s ease'
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </React.Fragment>
          ) : (
            (() => {
              const isSelected = location.pathname === `${basePath}/${item.path}`;
              
              return (
                <ListItemButton 
                  key={item.text} 
                  onClick={() => navigate(`${basePath}/${item.path}`)}
                  sx={{ 
                    my: 0.5,
                    borderRadius: 2,
                    py: 1.2,
                    ...(isSelected && {
                      bgcolor: alpha(item.color, 0.15),
                      '&:hover': {
                        bgcolor: alpha(item.color, 0.2),
                      },
                      borderRight: `3px solid ${item.color}`,
                      pl: item.highlight ? 1 : 2
                    }),
                    ...(item.highlight && !isSelected && {
                      borderLeft: `3px solid ${item.color}`,
                      pl: 1,
                    }),
                    '&:hover': {
                      bgcolor: alpha(item.color, 0.1),
                      transform: 'translateX(4px)',
                      boxShadow: `0 4px 12px ${alpha(item.color, 0.15)}`
                    },
                    position: 'relative',
                    transition: 'all 0.25s ease-in-out',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isSelected ? `0 4px 10px ${alpha(item.color, 0.2)}` : 'none',
                    overflow: 'hidden',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: isSelected ? 1 : 0,
                      transition: 'opacity 0.3s ease'
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isSelected ? item.color : 'inherit',
                    minWidth: 40,
                    transition: 'all 0.3s ease',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography
                          variant="body1"
                          sx={{ 
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? item.color : 'inherit',
                            transition: 'color 0.2s ease'
                          }}
                        >
                          {item.text}
                        </Typography>
                        {item.isNew && (
                          <Badge 
                            sx={{ 
                              ml: 1.5,
                              "& .MuiBadge-badge": {
                                fontSize: '0.6rem',
                                height: 18,
                                padding: '0 6px',
                                backgroundColor: '#ff0066',
                                color: 'white',
                                fontWeight: 'bold',
                                borderRadius: 10,
                                boxShadow: '0 2px 6px rgba(255, 0, 102, 0.4)',
                                animation: 'pulse 2s infinite'
                              },
                              '@keyframes pulse': {
                                '0%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0.7)' },
                                '70%': { boxShadow: '0 0 0 6px rgba(255, 0, 102, 0)' },
                                '100%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0)' }
                              }
                            }}
                            badgeContent="NEW"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })()
          )
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box 
        sx={{ 
          p: 2.5, 
          textAlign: 'center', 
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)',
          mt: 2
        }}
      >
        <Typography 
          variant="caption" 
          sx={{
            color: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
            fontWeight: 500,
            letterSpacing: '0.5px',
            fontSize: '0.7rem'
          }}
        >
          © {new Date().getFullYear()} SGT Learning Platform
          <Box component="span" sx={{ display: 'block', mt: 0.5, color: '#6366f1', fontWeight: 600 }}>
            Version 2.0
          </Box>
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
