# CodeBhasha 🇮🇳

**AI-powered coding environment that speaks your language**

[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![AWS](https://img.shields.io/badge/AWS-Bedrock-orange.svg)](https://aws.amazon.com/bedrock/)
[![Python](https://img.shields.io/badge/Python-3.x-green.svg)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Overview

CodeBhasha is an AI-powered coding environment designed to democratize computer science education in India. It enables students to write, speak, and understand code in **Hinglish** (Hindi-English mix), eliminating the language barrier that prevents millions of creative minds from learning programming.

> **"Coding sikhna ab ho gaya aasan!"**

## ✨ Key Features

### 🗣️ Voice-to-Code (Bol Ke Code)
- Speak your logic in Hindi, English, or Hinglish
- Powered by **Amazon Transcribe** for accurate voice recognition
- Handles Indian accents and code-switching patterns
- Edit transcriptions before generating code

### 🤖 Natural Language to Code Translation
- Type or speak commands in Hinglish
- Generate syntactically correct Python code using **Amazon Bedrock (Claude 3.5 Sonnet)**
- Side-by-side display of Hinglish input and Python output
- Support for loops, functions, conditionals, data structures, and more

### 💻 Interactive Code Editor
- Syntax-highlighted Python editor powered by **Monaco Editor**
- Real-time code execution using **Pyodide** (client-side Python)
- Live output console
- Code editing with undo/redo, copy/paste functionality

### 🛠️ Desi Debugger
Get error explanations in simple Hinglish instead of cryptic technical jargon:
- ❌ `IndexError` → ✅ *"List mein itne items nahi hain"*
- ❌ `NameError` → ✅ *"Ye variable define nahi kiya gaya"*
- ❌ `SyntaxError` → ✅ *"Code likhne mein galti hai"*
- ❌ `TypeError` → ✅ *"Galat type ka data use kiya"*

### 📚 Beginner-Friendly UI
- Clean, intuitive interface
- Light and dark theme support
- Example commands for quick start
- Command history tracking
- Responsive design for desktop and tablets

## 🎯 Problem Statement

In India, millions of students study in vernacular mediums. When they transition to coding, they face a double barrier:
1. Learning **programming logic**
2. Understanding **English syntax and error messages**

**CodeBhasha bridges this gap** by letting students focus on logic first, using the language they think in.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User's Browser                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │        React Frontend Application                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │  │
│  │  │  Voice   │  │   Code   │  │   Pyodide    │   │  │
│  │  │  Input   │  │  Editor  │  │ (Python)     │   │  │
│  │  └──────────┘  └──────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                       │
                       │ HTTPS/REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              AWS Cloud Services                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Amazon API Gateway                       │  │
│  └──────────────────────────────────────────────────┘  │
│           │                │               │            │
│           ▼                ▼               ▼            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Lambda    │  │   Lambda    │  │   Lambda    │   │
│  │(Transcribe) │  │ (Generate)  │  │  (Debug)    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│         │                │               │              │
│         ▼                ▼               ▼              │
│  ┌─────────────┐  ┌──────────────────────────────┐   │
│  │   Amazon    │  │   Amazon Bedrock             │   │
│  │ Transcribe  │  │ (Claude 3.5 Sonnet)          │   │
│  └─────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18+** - Component-based UI framework
- **Monaco Editor** - Code editor with syntax highlighting
- **Pyodide** - Client-side Python execution
- **Web Audio API** - Voice recording
- **Axios** - HTTP client for API calls
- **Tailwind CSS** - Styling framework

### Backend (Serverless)
- **AWS Lambda** - Serverless compute (Node.js 18.x)
- **Amazon API Gateway** - REST API endpoints
- **Amazon Bedrock** - Claude 3.5 Sonnet for code generation
- **Amazon Transcribe** - Speech-to-text conversion
- **Amazon S3** - Temporary audio storage
- **Amazon CloudWatch** - Logging and monitoring

### Development Tools
- **AWS CDK/Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD pipeline
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **AWS Account** with access to:
  - Amazon Bedrock (Claude 3.5 Sonnet)
  - Amazon Transcribe
  - Lambda, API Gateway, S3
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Microphone access (for voice input)

## 🏃‍♂️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Mehtab-24/Code-Bhasha.git
cd Code-Bhasha
```

### 2. Install Frontend Dependencies
```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
REACT_APP_API_GATEWAY_URL=https://your-api-gateway-url.amazonaws.com
REACT_APP_AWS_REGION=us-east-1
REACT_APP_ENVIRONMENT=development
```

### 4. Deploy Backend (AWS)

#### Using AWS CDK:
```bash
cd backend
npm install
cdk bootstrap
cdk deploy
```

#### Using Terraform:
```bash
cd backend/terraform
terraform init
terraform plan
terraform apply
```

### 5. Run Frontend Locally
```bash
npm start
# or
yarn start
```

The app will open at `http://localhost:3000`

## 🎨 Example Usage

### Voice-to-Code
1. Click the microphone button 🎤
2. Speak: *"10 tak ke numbers print karo"*
3. Review the transcription
4. Click "Generate Code"
5. Get Python code:
   ```python
   # 10 tak ke numbers print karo
   for i in range(1, 11):
       print(i)
   ```
6. Click "Run" to execute

### Text-to-Code
1. Type in the input box: *"list ko sort karo"*
2. Click "Generate Code"
3. Get Python code:
   ```python
   # List ko sort karo
   my_list = [5, 2, 8, 1, 9]
   my_list.sort()
   print(my_list)
   ```

### Debugging
When you encounter an error like `IndexError: list index out of range`, the Desi Debugger explains:

> **Error:** IndexError
> 
> **Hinglish Explanation:** 
> *"Bhai, list mein itne items nahi hain. Tumne 5th position ka item mangaa, but list mein sirf 3 items hain. Index ko check karo!"*
> 
> **Suggestion:** Use `len(my_list)` to check list size before accessing

## 📁 Project Structure

```
Code-Bhasha/
├── src/
│   ├── components/
│   │   ├── VoiceInput/
│   │   │   ├── VoiceRecorder.jsx
│   │   │   ├── TranscriptionDisplay.jsx
│   │   │   └── AudioVisualizer.jsx
│   │   ├── CodeEditor/
│   │   │   ├── Editor.jsx
│   │   │   ├── OutputConsole.jsx
│   │   │   └── ControlPanel.jsx
│   │   ├── NaturalLanguageInput/
│   │   │   ├── HinglishInput.jsx
│   │   │   └── ExampleCommands.jsx
│   │   ├── Debugger/
│   │   │   ├── ErrorDisplay.jsx
│   │   │   └── HinglishExplanation.jsx
│   │   └── Layout/
│   │       ├── Header.jsx
│   │       ├── Sidebar.jsx
│   │       └── MainLayout.jsx
│   ├── services/
│   │   ├── apiService.js
│   │   ├── pyodideService.js
│   │   └── audioService.js
│   ├── hooks/
│   │   ├── useVoiceRecording.js
│   │   ├── useCodeExecution.js
│   │   └── useDebugger.js
│   ├── utils/
│   │   ├── errorParser.js
│   │   └── codeFormatter.js
│   └── App.jsx
├── backend/
│   ├── lambda/
│   │   ├── transcribe/
│   │   ├── generate-code/
│   │   └── debug/
│   └── infrastructure/
│       ├── cdk/ or terraform/
├── public/
├── docs/
│   ├── design.md
│   └── requirements.md
├── package.json
└── README.md
```

## 📊 API Endpoints

### `POST /api/transcribe`
Convert audio to text
```json
{
  "audio": "base64_encoded_audio"
}
```
**Response:**
```json
{
  "text": "List ko sort karo"
}
```

### `POST /api/generate-code`
Generate Python code from Hinglish
```json
{
  "hinglishText": "10 tak ke numbers print karo"
}
```
**Response:**
```json
{
  "pythonCode": "for i in range(1, 11):\n    print(i)",
  "explanation": "This code prints numbers from 1 to 10"
}
```

### `POST /api/debug`
Get Hinglish error explanation
```json
{
  "code": "my_list[5]",
  "error": "IndexError: list index out of range",
  "stackTrace": "..."
}
```
**Response:**
```json
{
  "hinglishExplanation": "List mein itne items nahi hain...",
  "suggestions": ["Check list length", "Use valid index"]
}
```

## 🔒 Security

- **Sandboxed Execution**: Pyodide runs in browser isolation
- **API Authentication**: AWS IAM roles and API keys
- **HTTPS Only**: All communications encrypted
- **Input Sanitization**: Prevents injection attacks
- **Rate Limiting**: Protection against abuse
- **No Data Persistence**: User code is not stored

## 📈 Performance

- Voice transcription: **< 2 seconds**
- Code generation: **< 3 seconds**
- Error explanation: **< 2 seconds**
- Code execution: Starts within **500ms**
- Page load: **< 3 seconds**

## 🌟 Future Enhancements

1. **Multi-language Support** - Tamil, Telugu, Bengali, Marathi
2. **Code Snippets Library** - Pre-built examples in Hinglish
3. **Collaborative Coding** - Real-time code sharing with friends
4. **Progress Tracking** - Learning analytics and achievements
5. **Mobile App** - React Native version for smartphones
6. **Offline Mode** - Cache common translations
7. **Advanced Debugging** - Step-through debugger with breakpoints
8. **Code Optimization** - AI-powered performance suggestions

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Mehtab-24** - [GitHub](https://github.com/Mehtab-24)

## 🙏 Acknowledgments

- **Amazon Web Services** - For Bedrock, Transcribe, and serverless infrastructure
- **Anthropic** - For Claude 3.5 Sonnet
- **Pyodide Team** - For client-side Python execution
- **Indian Developer Community** - For inspiration and feedback

## 📞 Contact

For questions or feedback, please open an issue or reach out:

- **GitHub**: [@Mehtab-24](https://github.com/Mehtab-24)
- **Repository**: [Code-Bhasha](https://github.com/Mehtab-24/Code-Bhasha)

---

**Made with ❤️ for Indian students | Coding ab ho gayi aasan!**
