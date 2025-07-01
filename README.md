# Stay FocuSD

An intelligent productivity application that uses computer vision to monitor user attention and help maintain focus during work or study sessions.

## Available for MacOS & Windows

### [Download Application](Portfolio website link)

---

## Overview

Stay FocuSD is a desktop application that uses your webcam to analyze your attention status in real-time. The application employs computer vision and machine learning algorithms to determine if you're focused ("LOCKED IN") or distracted ("SLUMPED"), providing visual feedback to help you maintain productivity.

## Key Features

- **Real-time Attention Monitoring**: Uses your webcam to analyze facial expressions and body posture to detect focus levels.
- **Privacy Controls**: Easily toggle webcam visibility and retain control over your privacy.
- **Visual Feedback**: Clear status indicators show whether you're "LOCKED IN" or "SLUMPED".
- **Cross-Platform**: Works on both MacOS and Windows.

## Technologies Used

- **Frontend**: React with TypeScript
- **Desktop Application Framework**: Electron
- **Backend**: LAMP Stack (Linux, Apache, MySQL, PHP)
  - Backend repository: [https://github.com/BrandonGarate177/FocuSD_Lamp](https://github.com/BrandonGarate177/FocuSD_Lamp)

## How It Works

1. The application captures periodic frames from your webcam (default interval: 5 seconds).
2. These images are securely sent to the backend server for processing.
3. Computer vision algorithms analyze your posture and facial expressions to determine attention level.
4. The application displays your current attention status ("LOCKED IN" or "SLUMPED").

## Installation

### Prerequisites
- Node.js and npm

### Development Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd stay-focusd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Building for Production
To create a distributable version of the application:
```bash
npm run build
```

## Privacy and Security

- All image processing is done securely.
- You can toggle the webcam feed visibility at any time.
- Images are not stored permanently.
- The application requires webcam permissions to function.

## Requirements

- Webcam
- Internet connection (for API communication)
- MacOS or Windows operating system

---

## Backend Integration

This application works in conjunction with a LAMP stack backend that handles the image processing and machine learning components. The backend code is available in a separate repository at [https://github.com/BrandonGarate177/FocuSD_Lamp](https://github.com/BrandonGarate177/FocuSD_Lamp).

---

Created by Brandon Garate
