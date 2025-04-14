School of Arts and Sciences
Department of Computer Science and Mathematics
Task Manager Application
Capstone Project Report
Huda Badr
Nour Jalloul
14/04/2025
This page is intentionally left blank.
Table of Contents
Abstract ................................................................................................................ 1
Importance of the Project ...................................................................................... 2
Novelty of our Work ............................................................................................... 3
Contributions ........................................................................................................ 4
Major Features ……………………………………………………………………………………………..5
Features and Services ........................................................................................... 7
Implemented Features.………………………………………………………………………………..10
Screenshots and Progress…………………………………………………………………………….11
Remaining Features and Timeline…………………………………………………………………..19
Conclusion...………………………………………………………………………………………………21
1 | P a g e
I.
Abstract
Most task management applications do not consider personal and emotional aspects of productivity, which frustrates users and makes them disengaged. The Personal Task Manager fills in that gap by introducing mood-driven task prioritization, a personal milestone tracker, and gamification through progress rewards. Unlike existing tools, it dynamically adjusts task suggestions based on emotional input, helping users stay productive even during stressful or low-energy times. It integrates milestone tracking and rewards to ensure motivation, without making the process overcomplicated or hard to use. For users who balance daily tasks with big-picture goals, this app is the redefinition of task management, offering intuitive and emotionally intelligent ways to be productive.
2 | P a g e
II.
Importance of the Project
•
Addressing Task Management Challenges: Studies show that 70% of users abandon task management apps due to limited customization and lack of engagement. Our app fills this gap by offering dynamic features like mood-driven prioritization and gamification.
•
Target Audience: Designed specifically for busy professionals, students, and goal-oriented individuals, our app provides tailored task management solutions for diverse needs.
•
Societal Benefits: By incorporating features that reduce stress and improve mental well-being, the app has the potential to positively impact users' daily lives and productivity.
•
Boosting Productivity: Adaptive AI and mood-based prioritization ensure users focus on tasks they are most capable of completing, leading to better time management and reduced procrastination.
•
Unique Features for Engagement: Unlike traditional task managers, our app uses gamification and habit-based task suggestions to keep users motivated and consistent.
3 | P a g e
III.
Novelty of Our Work
•
Competitors (like Todoist, Microsoft To Do, Omni Focus, etc..) often focus on productivity but lack unique features like customizable and easy to use interface, unique tools, adaptive task scheduling, etc.
•
The app stands out by incorporating features like:
o
Habit-Based Task Suggestions
o
Personal Milestone Tracker
o
Gamification with Progress Rewards
o
Chatbot AI
4 | P a g e
IV.
Contributions Compared to Existing Work
•
Merging simplicity and functionality for a personal, non-enterprise audience.
•
Reducing cognitive load by offering adaptive task suggestions (e.g., categorizing tasks as morning/evening).
•
Technical Contributions: Our app introduces mood analysis combined with adaptive task scheduling—a feature currently missing in most personal task managers.
•
User-Centric Innovations: By seamlessly integrating gamification, mood-driven task sorting, and habit-based suggestions, the app ensures high user engagement and retention.
•
Practical Use Cases:
o
Example: when a user feels fatigued, the app dynamically suggests lighter tasks like "organize files" instead of more demanding ones like "write a report," ensuring task progress regardless of energy levels.
5 | P a g e
V.
Major Features
1.
Task Creation and Management
•
Description: Users can create and manage tasks by specifying their titles, descriptions, deadlines, and priority levels (high, medium, low). This feature ensures that users can efficiently keep track of multiple tasks and categorize them for easier management.
2.
Time Management Tools
•
Description: The app includes built-in time management features, such as a Pomodoro timer. The Pomodoro timer allows users to work in intervals (typically 25 minutes of focused work followed by a short break), helping users stay productive. This feature enhances productivity by encouraging time management and providing valuable insights into task completion rates.
3.
Mood and Productivity Tracking
•
Description: Users can log their mood throughout the day. So when they enter the application, it asks if he/she want to enter the mood they are currently in and they choose one of the present sentiments in the list, they get a recommended task.
4.
Personalization and Customization
•
Description: The app allows users to personalize their experience by offering options to customize themes, such as choosing color schemes or layouts. This feature is aimed at making the app feel more tailored to individual preferences, improving user satisfaction and engagement. Personalization makes the app more appealing by providing flexibility and a unique experience for each user.
5.
Gamification and Analytics
•
Description: To enhance user engagement and motivation, the app incorporates gamification elements. Users earn rewards for completing tasks or achieving productivity milestones. The app also provides basic productivity analytics in the form of charts or graphs to help users visualize their task completion rates over time. These visualizations help users see their progress and stay motivated.
6 | P a g e
6.
Chatbot AI Assistant
•
Description: The app includes an AI-powered chatbot to assist users with their tasks. If users need help or guidance, they can interact with the chatbot in natural language. It is also able to create tasks
7 | P a g e
VI.
Features and Services
A.
System Requirements
1.
Task Creation and Customization
•
The system must allow users to create new tasks by entering a title, description, due date, and additional task attributes such as categories, labels, and priorities.
2.
Due Date and Reminder Notifications
•
The system must trigger notifications for tasks based on due dates, both within the app and through external notifications, to remind users of upcoming deadlines.
3.
Task Prioritization and Sorting
•
The system must allow users to assign and sort tasks based on priority levels, such as high, medium, and low.
4.
Recurring Tasks
•
The system must support the creation of recurring tasks, with customizable intervals for daily, weekly, or monthly repetition.
5.
Task Progress Tracking
•
The system must allow users to mark tasks as “In Progress,” “Completed,” and visually track the progress of tasks.
6.
Task Categories and Grouping
•
The system must enable users to create and group tasks into customizable categories, such as work, personnel, shopping, etc.
7.
Search and Filter Functionality
•
The system must provide a search bar for users to quickly find tasks and filter them based on parameters like priority, category or completion status.
8.
Task Analytics and Insights
•
The system must generate analytics on task completion rates, time spent on tasks, and productivity overviews for the user.
9.
Data Encryption and Privacy
•
The system must implement data encryption for sensitive user information, ensuring privacy and security compliance.
8 | P a g e
B.
User Requirements
1.
User Credentials
•
Users must be able to use their usernames/email and password to login to their accounts and enable them to access their tasks from different devices.
2.
Task Creation and Customization
•
Users must be able to create tasks by entering a title, description, due date, and other customizable attributes like category and priority.
3.
Due Date and Reminder Notifications
•
Users must be notified of upcoming tasks through in-app notifications and external reminders based on set due dates.
4.
Task Prioritization and Sorting
•
Users must be able to assign priorities (high, medium, low) to tasks and sort them accordingly to manage tasks more effectively.
5.
Recurring Tasks
•
Users must have the ability to set tasks to recur at regular intervals (e.g., daily, weekly, monthly) for tasks with repeating requirements.
6.
Task Progress Tracking
•
Users must be able to track task progress by marking tasks as “In Progress” or “Completed,” enabling better time management.
7.
Task Categories and Grouping
•
Users must be able to group tasks by category, such as “Work,” “Personal,” “Shopping,” etc., to simplify task organization and focus.
8.
Search and Filter Functionality
•
Users must be able to search for tasks by title, keyword, or category and filter them based on priority, due date, or completion status.
9.
Voice Command Integration
•
Users must be able to create and manage tasks via voice commands for hands-free operation and improved accessibility. This will be done in the chatbot.
10.
Gamification (Reward System)
•
Users must be able to earn points for completing tasks, hitting productivity goals, or maintaining streaks, adding a gamified element to task management.
9 | P a g e
11.
Customizable Themes and User Interface
•
Users must be able to customize the app’s theme and user interface by selecting between light, dark, or custom color schemes and layouts.
12.
Task Completion Notifications
•
Users must be notified when a task is completed, providing positive reinforcement and helping them keep track of achievements.
10 | P a g e
VII.
Implemented Features
1.
User Authentication and Access
•
The system must allow users to log in using a username or email and password.
•
Users must be able to access their tasks from different devices.
2.
Task Creation and Customization
•
Users must be able to create new tasks by entering a title, description, due date, and additional attributes like categories, labels, and priorities.
3.
Task Prioritization and Sorting
•
Users must be able to assign priority levels (e.g., high, medium, low) to tasks.
•
The system must support sorting tasks based on priority.
4.
Recurring Tasks
•
The system must allow users to create recurring tasks with customizable intervals (daily, weekly, monthly).
5.
Task Progress Tracking
•
Users must be able to mark tasks as “In Progress” or “Completed.”
•
The system must visually track the progress of tasks.
6.
Search and Filter Functionality
•
The system now supports filtering by completion status.
7.
Data Encryption and Privacy
•
The system must implement encryption to protect user data and ensure compliance with privacy standards.
11 | P a g e
VIII.
Screenshots and Progress:
A.
Implemented:
Figure 1: Sign up Page
Figure 2: Dashboard Page
12 | P a g e
Figure 3: Creating a recurring task
Figure 4: Creating a task page
13 | P a g e
Figure 5: Message after Successfully Creating a task or a recurring task
Figure 6: Filter by completion status page.
Figure 7: Achievements Page
14 | P a g e
Figure 8: Achievement page with points and status
Figure 9: Checking the mood of the user
15 | P a g e
Figure 10: The recommended tasks after entering the mood
Figure 11: Calendar page with tasks
16 | P a g e
Figure 12: AI Chatbot page
Figure 13: Creating tasks inside the calendar page
17 | P a g e
Figure 12: Pomodoro Timer Page
Figure 15: Pomodoro Timer Settings
18 | P a g e
B.
Future Features:
The following figures show what we will implement in the future and how it will look like:
Figure 16: The Dashboard Page
Figure 17: The Store Page derived from Game Page
19 | P a g e
IX.
Remaining Features and Timeline
A.
Remaining Features
1.
Filter & Sort Options
•
Filtering tasks based on urgency or category.
•
Sorting tasks by deadline, priority, or estimated time.
2.
Customizable Themes
•
Theme color selector for personalization.
3.
User Profile Customization
•
Enable editing of user details such as name and email.
4.
Mood-Based Task Recommendation – Enhancement
•
Fine-tune the recommendation logic for better alignment with user mood and task type.
5.
Analytics Dashboard
•
Display user progress: tasks completed, category breakdown, time spent per category.
•
Weekly summary charts (e.g., bar chart or pie chart).
•
Mood trends and task performance overview.
6.
Forgot Password Logic
•
Implement a way for users to reset their password.
7.
Notification Reminder
•
The system must send in-app and external notifications to remind users of tasks approaching their due dates.
8.
Bug Fixing & Refinements
•
Address any issues and polish the UI for a smoother experience.
20 | P a g e
B. Updated Time Plan (April 14–April 25)
Dates
Tasks to Complete
April 14 – April 18
- Filter & Sort Options - Customizable Themes
April 19 – April 22
- User Profile Customization - Mood-Based Task Recommendation Enhancement
April 23 – April 25
- Analytics Dashboard - Forgot Password Logic
- Notifications Reminder - Bug Fixing & Refinements
21 | P a g e
X.
Conclusion
Our capstone project is currently in the development stage, and we’ve already made strong progress by completing several key features of the application. So far, we’ve implemented important components like gamification to help keep users motivated, and we’ve ensured that the app works consistently across different platforms and devices.
At this point, the core structure of our task manager app is in place, and we’re now moving on to developing the remaining features. These include adding task filtering options so users can better organize their to-do lists, mood-based recommendations to support mental wellness, and analytics to help users track their progress and productivity over time. We're also planning to enhance the overall user interface and user experience to make the app easier and more enjoyable to use.
Although there’s still more to do, we’ve built a solid foundation and are confident that we’ll be able to complete the project within the given timeline. Our team is committed to delivering a polished and functional application that meets the goals we set at the beginning of the project.
GitHub Link: https://github.com/huda-badr/TaskManager_app