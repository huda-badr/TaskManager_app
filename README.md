School of Arts and Sciences 
Department of Computer Science and Mathematics 
Task Manager Application 
Capstone Project Report 
Huda Badr 
Nour Jalloul 
5/2/2025 
This page is intentionally left blank. 
Table of Contents 
Abstract .............................................................................................................. 1 
Importance of the Project ..................................................................................... 2 
Novelty of our Work .............................................................................................. 3 
Contributions ...................................................................................................... 4 
Major Features ……………………………………………………………………………………………..5 
Features and Services .......................................................................................... 7 
Implemented Features.………………………………………………………………………………..11 
Screenshots and Progress…………………………………………………………………………….12 
Remaining Features and Timeline…………………………………………………………………..18 
Conclusion ..………………………………………………………………………………………………20 
I. 
Abstract 
Most task management applications do not consider personal and emotional 
aspects of productivity, which frustrates users and makes them disengaged. The 
Personal Task Manager fills in that gap by introducing mood-driven task prioritization, 
a personal milestone tracker, and gamification through progress rewards. Unlike 
existing tools, it dynamically adjusts task suggestions based on emotional input, 
helping users stay productive even during stressful or low-energy times. It integrates 
milestone tracking and rewards to ensure motivation, without making the process 
overcomplicated or hard to use. For users who balance daily tasks with big-picture 
goals, this app is the redefinition of task management, offering intuitive and 
emotionally intelligent ways to be productive. 
1 | P a g e 
II. 
Importance of the Project 
• Addressing Task Management Challenges: Studies show that 70% of users 
abandon task management apps due to limited customization and lack of 
engagement. Our app fills this gap by offering dynamic features like mood
driven prioritization and gamification. 
• Target Audience: Designed specifically for busy professionals, students, and 
goal-oriented individuals, our app provides tailored task management 
solutions for diverse needs. 
• Societal Benefits: By incorporating features that reduce stress and improve 
mental well-being, the app has the potential to positively impact users' daily 
lives and productivity. 
• Boosting Productivity: Adaptive AI and mood-based prioritization ensure users 
focus on tasks they are most capable of completing, leading to better time 
management and reduced procrastination. 
• Unique Features for Engagement: Unlike traditional task managers, our app 
uses gamification and habit-based task suggestions to keep users motivated 
and consistent. 
2 | P a g e 
III. Novelty of Our Work 
• Competitors (like Todoist, Microsoft To Do, Omni Focus, etc..) often focus on 
productivity but lack unique features like customizable and easy to use 
interface, unique tools, adaptive task scheduling, etc. 
• The app stands out by incorporating features like: 
o Habit-Based Task Suggestions 
o Mood-Driven Task Prioritization 
o Personal Milestone Tracker 
o Gamification with Progress Rewards 
o Chatbot AI 
3 | P a g e 
IV. Contributions Compared to Existing Work 
• Merging simplicity and functionality for a personal, non-enterprise audience. 
• Reducing cognitive load by offering adaptive task suggestions (e.g., 
categorizing tasks as morning/evening). 
• Technical Contributions: Our app introduces mood analysis combined with 
adaptive task scheduling—a feature currently missing in most personal task 
managers. 
• User-Centric Innovations: By seamlessly integrating gamification, mood
driven task sorting, and habit-based suggestions, the app ensures high user 
engagement and retention. 
• Practical Use Cases:  
o Example: when a user feels fatigued, the app dynamically suggests 
lighter tasks like "organize files" instead of more demanding ones like 
"write a report," ensuring task progress regardless of energy levels. 
4 | P a g e 
V. Major Features 
1. Task Creation and Management  
• Description: Users can create and manage tasks by specifying 
their titles, descriptions, deadlines, and priority levels (high, 
medium, low). Tasks can be categorized automatically based on 
keywords (e.g., “work”, “shopping”, “home”) to improve 
organization and make it easier for users to track specific types of 
tasks. This feature ensures that users can efficiently keep track of 
multiple tasks and categorize them for easier management.  
2. Time Management Tools  
• Description: The app includes built-in time management features, 
such as a Pomodoro timer and a focus mode. The Pomodoro 
timer allows users to work in intervals (typically 25 minutes of 
focused work followed by a short break), helping users stay 
productive. Additionally, the app tracks how long tasks take to 
complete, and based on historical data, the app can predict the 
time required for similar future tasks using a regression model. 
This feature enhances productivity by encouraging time 
management and providing valuable insights into task completion 
rates.  
3. Mood and Productivity Tracking  
• Description: Users can log their mood and productivity levels 
throughout the day. The app tracks the correlation between users' 
moods and task completion efficiency, helping them identify 
patterns (e.g., which types of tasks are easier to complete when 
feeling happy or energized). So when they enter the application, it 
asked if he/she want to enter the mood they are currently in and 
they choose one of the present sentiments in the list, they get a 
recommended task. Additionally, machine learning models can 
be used to analyze how certain tasks impact moods, providing 
insights into optimal task assignment based on emotional states.  
4. Personalization and Customization  
• Description: The app allows users to personalize their experience 
by offering options to customize themes, such as choosing color 
schemes or layouts. This feature is aimed at making the app feel 
more tailored to individual preferences, improving user satisfaction 
5 | P a g e 
and engagement. Personalization makes the app more appealing 
by providing flexibility and a unique experience for each user.  
5. Gamification and Analytics  
• Description: To enhance user engagement and motivation, the app 
incorporates gamification elements. Users earn badges and 
rewards for completing tasks or achieving productivity milestones. 
The app also provides basic productivity analytics in the form of 
charts or graphs to help users visualize their task completion rates 
over time. These visualizations help users see their progress, stay 
motivated, and identify areas for improvement in their workflow.  
6. Offline Functionality  
• Description: Users can continue managing their tasks offline by 
storing data locally on their device. Tasks and updates are synced 
with the cloud once the device reconnects to the internet. This 
ensures that users can remain productive even without a stable 
internet connection, a critical feature for users on the go or in areas 
with limited connection.  
7. Chatbot AI Assistant 
• Description: The app includes an AI-powered chatbot to assist 
users with their tasks. If users need help or guidance, they can 
interact with the chatbot in natural language. 
6 | P a g e 
Features and Services  
VI. 
A. System Requirements  
1. Task Creation and Customization  
• The system must allow users to create new tasks by entering a title, 
description, due date, and additional task attributes such as 
categories, labels, and priorities.  
2. Due Date and Reminder Notifications  
• The system must trigger notifications for tasks based on due dates, 
both within the app and through external notifications, to remind 
users of upcoming deadlines.  
3. Task Prioritization and Sorting  
• The system must allow users to assign and sort tasks based on 
priority levels, such as high, medium, and low.  
4. Recurring Tasks  
• The system must support the creation of recurring tasks, with 
customizable intervals for daily, weekly, or monthly repetition.  
5. Task Progress Tracking  
• The system must allow users to mark tasks as “In Progress,” 
“Completed,” or “Pending,” and visually track the progress of tasks.  
6. Task Categories and Grouping  
• The system must enable users to create and group tasks into 
customizable categories, such as work, personnel, shopping, etc.  
7. Search and Filter Functionality  
• The system must provide a search bar for users to quickly find tasks 
and filter them based on parameters like priority, due date, or 
completion status.  
8. Integration with Calendar and To-Do Apps  
• The system must integrate with external calendar and to-do 
applications (e.g., Google Calendar) to sync tasks with existing user 
schedules.  
9. Task Analytics and Insights  
• The system must generate analytics on task completion rates, time 
spent on tasks, and productivity overviews for the user.  
10. Smart Task Categorization (Machine Learning)  
• The system must incorporate a machine learning model to 
automatically categorize tasks based on content with the model 
improving over time based on user input.  
7 | P a g e 
11. Data Encryption and Privacy  
• The system must implement data encryption for sensitive user 
information, ensuring privacy and security compliance.  
8 | P a g e 
B. User Requirements  
1. User Credentials 
Users must be able to use their usernames/email and password to login to 
their accounts and enable them to access their tasks from different devices. 
2. Task Creation and Customization  
Users must be able to create tasks by entering a title, description, due date, 
and other customizable attributes like category, priority, and labels.  
3. Due Date and Reminder Notifications  
Users must be notified of upcoming tasks through in-app notifications and 
external reminders based on set due dates.  
4. Task Prioritization and Sorting  
Users must be able to assign priorities (high, medium, low) to tasks and sort 
them based on these priorities to manage tasks more effectively.  
5. Recurring Tasks  
Users must have the ability to set tasks to recur at regular intervals (e.g., daily, 
weekly, monthly) for tasks with repeating requirements.  
6. Task Progress Tracking  
Users must be able to track task progress by marking tasks as “In Progress,” 
“Completed,” or “Pending,” enabling better time management.  
7. Task Categories and Grouping  
Users must be able to group tasks by category, such as “Work,” “Personal,” 
“Shopping,” etc., to simplify task organization and focus.  
8. Search and Filter Functionality  
Users must be able to search for tasks by title, keyword, or category and filter 
them based on priority, due date, or completion status.  
9. Voice Command Integration  
Users must be able to create and manage tasks via voice commands for 
hands-free operation and improved accessibility. This will be done via an API. 
10. Sentiment-Based Mood Analytics  
Users must be able to view sentiment-based analytics on tasks, showing how 
tasks’ descriptions affect their mood (positive, neutral, or negative) over time.  
11. Gamification (Reward System)  
Users must be able to earn points or badges for completing tasks, hitting 
productivity goals, or maintaining streaks, adding a gamified element to task 
management.  
12. Offline Mode  
Users must be able to access and manage tasks offline, with the app syncing 
changes when the user returns online.  
9 | P a g e 
13. Customizable Themes and User Interface  
Users must be able to customize the app’s theme and user interface by 
selecting between light, dark, or custom color schemes and layouts.  
14. Task Completion Notifications  
Users must be notified when a task is completed, providing positive reinforcement 
and helping them keep track of achievements. 
10 | P a g e 
VIII. Implemented Features 
1. Database Implementation 
o Online database using Firebase Cloud Firestore (NoSQL) database, 
which was connected to android studio for online hosting and 
authentication. 
o Offline database using PhpMyAdmin, to store data that might be added 
or updated when the application is offline. The database was created 
but not yet integrated. 
2. Features Implemented So Far 
o Splash Screen: Initial loading screen. 
o Authentication: Login & Sign-up using Firebase Authentication. 
o Main Page: Contains menu buttons for Home, Dashboard, and Mood 
that use fragments to switch from one activity to another. 
11 | P a g e 
IX. Screenshots and Progress: 
A. Implemented: 
The following figures show the implemented function in android studio: 
Figure 1: The Main Page(Home)                                            
Figure 2: The Log In Page 
12 | P a g e 
Figure 3: The Sign up Page                         
13 | P a g e 
B. Future Features: 
The following figures show what we will implement in the future and how it will 
look like: 
Figure 4: The Main Page (Home)               
14 | P a g e 
Figure 5: The Dashboard Page     
15 | P a g e 
Figure 6: Adding The Tasks  
Figure 7: The Mood Page  
16 | P a g e 
Figure 8: The Game Page            
Figure 9: The Store Page derived from Game Page               
17 | P a g e 
X. Remaining Features and Timeline 
I. 
II. 
Machine Learning Model for Mood Analysis (Feb 5 - Feb 15, 2025) 
➢ Data Collection and training the model 
o Logistic Regression or Random Forest. 
o Where if the user selected mood e.g., “happy”, it will increase 
productivity tasks, whereas “stressed” reduces workload. 
➢ Integrate with Firebase, where we test Firebase integration with different 
network conditions (offline/online mode). 
Mood Page Implementation (Feb 15 - Feb 20, 2025) 
➢ Design and Implement the UI 
o Create a mood page UI that allows users to select how they feel. 
o Ensure the UI is intuitive and responsive. 
➢ Connect to Firebase 
o Store user mood selections in Firebase. 
o Implement timestamp tracking so moods can be analyzed over time. 
➢ Link Mood to Task Prioritization 
o Develop logic where different moods affect task suggestions: 
o Happy/Energetic → Suggest high-priority tasks. 
o Stressed → Suggest smaller, manageable tasks. 
o Tired → Recommend breaks or passive activities. 
18 | P a g e 
III. 
IV. 
V. 
VI. 
VII. 
Game Page Implementation (Feb 20 - Feb 25, 2025) 
➢ Design and Implement Gamification Elements 
o Create a game button UI that shows task rewards and progress. 
o Add badges, streaks, levels, or points based on task completion. 
o Implement progress tracking (e.g., percentage of completed tasks). 
o Add a companion that can be upgraded using the points and levels. 
➢ Connect to Firebase 
Task Management Finalization (Feb 25 - Mar 5, 2025) 
➢ Complete Core Functionalities 
o Ensure all CRUD functions work properly. 
o Implement advanced sorting and filtering: 
▪ By Priority (High, Medium, Low). 
▪ By Due Date (Upcoming, Overdue, Completed). 
▪ By Mood. 
➢ Testing and Final Refinements where we conduct end-to-end tests 
ensuring all task functionalities work smoothly. 
Offline Mode Testing & Optimization (Mar 5 - Mar 10, 2025) 
➢ Test Offline Mode Functionality 
➢ Implement Synchronization Logic 
o Ensure all offline changes sync to Firebase once online. 
Notification System Completion (Mar 10 - Mar 15, 2025) 
➢ Implement Push Notifications 
o Set up Firebase Cloud Messaging (FCM) to send notifications. 
UI/UX Improvements (Mar 15 - Mar 20, 2025) 
➢ Improve Design and Navigation 
➢ Add Customization Options 
VIII. Final Testing and Debugging (Mar 20 - Apr 1, 2025) 
➢ Comprehensive Feature Testing 
➢ Final User Testing and Feedback 
19 | P a g e 
IX. 
Capstone Report Completion (Apr 1 - Apr 10, 2025) 
➢ Complete the final report of the project.  
20 | P a g e 
XI. Conclusion 
As of now, our capstone project remains in the planning and early 
development stages. We have outlined the key features of our task manager 
application, focusing on aspects like adaptive AI, gamification, offline-first 
design, and cross-platform consistency. Additionally, we have conducted an 
analysis of existing task management apps to identify gaps and opportunities for 
improvement. 
So far, we have worked on the initial setup, including creating the database, 
designing the login and signup pages, and developing the main page with a splash 
screen. However, the core functionalities—such as task creation, AI-powered 
suggestions, and productivity tracking—are yet to be implemented. 
While there is still a significant amount of work to be done, the foundation has 
been set, and we are prepared to move forward with development and 
implementation in the coming weeks. 
GitHub Link: https://github.com/huda-badr/TaskManager_app
21 | P a g e 