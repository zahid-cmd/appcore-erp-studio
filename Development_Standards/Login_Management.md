Backend_Studio
│
├── AppCore.API
│   └── Platform
│       └── Authentication
│           └── AuthenticationController.cs                         [1]
│
├── AppCore.Application
│   └── Platform
│       └── Authentication
│           ├── DTOs
│           │   ├── ForgotPasswordRequestDto.cs                    [2]
│           │   ├── LoginRequestDto.cs                             [3]
│           │   ├── LoginResponseDto.cs                            [4]
│           │   └── RegisterRequestDto.cs                          [5]
│           │
│           ├── Interfaces
│           │   └── IAuthenticationService.cs                      [6]
│           │
│           └── Service
│               └── AuthenticationService.cs                       [7]
│
├── AppCore.Domain
│   └── Platform
│       └── Authentication
│           └── UserCredential.cs                                   [8]
│
└── AppCore.Infrastructure
    └── Platform
        └── Authentication
            └── UserCredentialConfiguration.cs                      [9]