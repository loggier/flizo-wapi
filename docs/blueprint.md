# **App Name**: Evolution Dashboard

## Core Features:

- User Authentication: Secure user authentication using credentials defined in the .env file.
- Instance Creation: Allow users to create new Evolution API instances associated with their account.
- QR Code Connection: Connect the instance to the Evolution API server at http://69.10.48.78:8080/ via QR code scanning.
- Instance Management: Manage created instances: view details, disconnect, or delete instances, all actions modifying a JSON configuration file.
- API Key Generation: Automatically generate a unique URL (API key) for each instance, allowing the user to integrate and send messages via GET requests through their Evolution API instance.
- Help & Tool Prompts: Offer clear guidance (a 'tool') on available API features for custom integration

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey stability and professionalism.
- Background color: Light blue-gray (#ECEFF1) to ensure a clean and modern interface.
- Accent color: Teal (#009688) to highlight active elements and important actions.
- Headline font: 'Space Grotesk', a modern sans-serif for headers and titles.
- Body font: 'Inter', a clean and readable sans-serif for descriptions and instructions.
- Use minimalist icons to represent actions such as connecting, disconnecting, and deleting instances.
- A clear and structured layout, using panels and cards to organize information effectively.