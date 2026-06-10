export const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "QuizArena API Documentation",
    "description": "Complete OpenAPI 3.0 reference documentation for the QuizArena backend APIs. Authentication is managed via a JWT cookie (`token`). Role-based access control restricts endpoints based on user roles (`admin`, `instructor`, `candidate`).",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000/api/v1",
      "description": "Development API Server"
    }
  ],
  "security": [
    {
      "cookieAuth": []
    }
  ],
  "components": {
    "securitySchemes": {
      "cookieAuth": {
        "type": "apiKey",
        "in": "cookie",
        "name": "token",
        "description": "JWT session cookie named `token` set upon successful login/signup."
      }
    },
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "60d0fe4f5311236168a109ca" },
          "name": { "type": "string", "example": "John Doe" },
          "email": { "type": "string", "format": "email", "example": "john@example.com" },
          "role": { "type": "string", "enum": ["admin", "instructor", "candidate"], "example": "candidate" },
          "status": { "type": "string", "enum": ["active", "inactive"], "example": "active" }
        }
      },
      "Quiz": {
        "type": "object",
        "properties": {
          "_id": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
          "title": { "type": "string", "example": "React 101" },
          "description": { "type": "string", "example": "A quiz on React basics" },
          "duration": { "type": "number", "example": 30 },
          "questionType": { "type": "string", "enum": ["single", "multi"], "example": "single" },
          "instructorId": { "type": "string", "example": "60d0fe4f5311236168a109ca" },
          "status": { "type": "string", "enum": ["Draft", "Scheduled", "Live", "Completed", "Cancelled", "Expired"], "example": "Draft" },
          "startTime": { "type": "string", "format": "date-time", "nullable": true, "example": "2026-06-15T10:00:00Z" },
          "endTime": { "type": "string", "format": "date-time", "nullable": true, "example": "2026-06-15T12:00:00Z" },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" }
        }
      },
      "Question": {
        "type": "object",
        "properties": {
          "_id": { "type": "string", "example": "60d0fe4f5311236168a109cc" },
          "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
          "question": { "type": "string", "example": "What is JSX?" },
          "options": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 4,
            "maxItems": 4,
            "example": ["A syntax extension", "A JavaScript library", "A database system", "CSS in JS"]
          },
          "correctAnswers": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0, "maximum": 3 },
            "description": "Indexes of correct options. Only exposed to admins and instructors.",
            "example": [0]
          }
        }
      },
      "Participant": {
        "type": "object",
        "properties": {
          "_id": { "type": "string", "example": "60d0fe4f5311236168a109cd" },
          "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
          "userId": {
            "oneOf": [
              { "type": "string" },
              {
                "type": "object",
                "properties": {
                  "_id": { "type": "string" },
                  "name": { "type": "string" },
                  "email": { "type": "string", "format": "email" },
                  "status": { "type": "string" }
                }
              }
            ]
          },
          "assignedAt": { "type": "string", "format": "date-time" }
        }
      },
      "Attempt": {
        "type": "object",
        "properties": {
          "_id": { "type": "string", "example": "60d0fe4f5311236168a109ce" },
          "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
          "candidateId": { "type": "string", "example": "60d0fe4f5311236168a109cf" },
          "startedAt": { "type": "string", "format": "date-time" },
          "submittedAt": { "type": "string", "format": "date-time", "nullable": true },
          "status": { "type": "string", "enum": ["InProgress", "Submitted", "AutoSubmitted"], "example": "InProgress" },
          "score": { "type": "number", "example": 8 },
          "timeTaken": { "type": "number", "description": "Time taken in seconds", "example": 450 },
          "answers": {
            "type": "object",
            "additionalProperties": {
              "type": "array",
              "items": { "type": "integer" }
            },
            "description": "Map of Question IDs to candidate's selected option indexes",
            "example": { "60d0fe4f5311236168a109cc": [0] }
          }
        }
      },
      "StandardError": {
        "type": "object",
        "properties": {
          "success": { "type": "boolean", "example": false },
          "message": { "type": "string", "example": "An error occurred" }
        }
      }
    }
  },
  "paths": {
    "/auth/signup": {
      "post": {
        "summary": "Register a new user",
        "description": "Registers a new user and sets a secure httpOnly session cookie.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "password"],
                "properties": {
                  "name": { "type": "string", "minLength": 2, "example": "John Doe" },
                  "email": { "type": "string", "format": "email", "example": "john@example.com" },
                  "password": { "type": "string", "minLength": 8, "example": "securepassword123" },
                  "role": { "type": "string", "enum": ["admin", "instructor", "candidate"], "default": "candidate", "example": "candidate" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created successfully",
            "headers": {
              "Set-Cookie": {
                "schema": { "type": "string", "example": "token=jwt_value_here; Path=/; HttpOnly; SameSite=Strict" }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Validation failed",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          },
          "499": {
            "description": "Conflict: Email already exists",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "User login",
        "description": "Authenticates a user with credentials and issues an HTTP-only cookie session token.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": { "type": "string", "format": "email", "example": "john@example.com" },
                  "password": { "type": "string", "example": "securepassword123" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "headers": {
              "Set-Cookie": {
                "schema": { "type": "string", "example": "token=jwt_value_here; Path=/; HttpOnly; SameSite=Strict" }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "summary": "User logout",
        "description": "Clears the JWT session cookie.",
        "security": [],
        "responses": {
          "200": {
            "description": "Logout successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "type": "object", "nullable": true, "example": null }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      "get": {
        "summary": "Get current session profile",
        "description": "Returns details of the currently authenticated user.",
        "responses": {
          "200": {
            "description": "Current user details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthenticated",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          }
        }
      }
    },
    "/users/assign-instructor": {
      "post": {
        "summary": "Assign user to instructor role",
        "description": "Allows an admin to assign an existing user by email to be an instructor.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email"],
                "properties": {
                  "email": { "type": "string", "format": "email", "example": "instructor_candidate@example.com" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Instructor assigned successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden: Requires Admin role",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          },
          "404": {
            "description": "User email not found",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/StandardError" } } }
          }
        }
      }
    },
    "/users/instructors": {
      "get": {
        "summary": "Get list of all instructors",
        "description": "Required role: Admin.",
        "responses": {
          "200": {
            "description": "List of instructors",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/User" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/users/candidates": {
      "get": {
        "summary": "Get list of all candidates",
        "description": "Required role: Admin or Instructor.",
        "responses": {
          "200": {
            "description": "List of candidates",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/User" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/quizzes": {
      "post": {
        "summary": "Create a new quiz",
        "description": "Required role: Admin or Instructor. Creates a quiz in Draft state.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["title", "duration"],
                "properties": {
                  "title": { "type": "string", "minLength": 3, "example": "Algorithms Masterclass" },
                  "description": { "type": "string", "example": "Comprehensive assessment on sorting & searching algorithms" },
                  "duration": { "type": "integer", "description": "Duration in minutes", "example": 45 },
                  "questionType": { "type": "string", "enum": ["single", "multi"], "default": "single" },
                  "startTime": { "type": "string", "format": "date-time", "nullable": true, "example": "2026-06-15T10:00:00Z" },
                  "endTime": { "type": "string", "format": "date-time", "nullable": true, "example": "2026-06-15T12:00:00Z" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Quiz created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Quiz" }
                  }
                }
              }
            }
          }
        }
      },
      "get": {
        "summary": "List quizzes",
        "description": "Aggregates and filters quizzes depending on roles:\n- Instructor: gets quizzes created by them.\n- Candidate: gets quizzes assigned to them (excluding Drafts).\n- Admin: gets all quizzes in the platform.",
        "responses": {
          "200": {
            "description": "List of quizzes with question count, participant count, and candidate attempt status where applicable",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "array",
                      "items": {
                        "allOf": [
                          { "$ref": "#/components/schemas/Quiz" },
                          {
                            "type": "object",
                            "properties": {
                              "questionCount": { "type": "integer", "example": 10 },
                              "participantCount": { "type": "integer", "example": 25 },
                              "candidateAttempt": {
                                "type": "object",
                                "nullable": true,
                                "properties": {
                                  "id": { "type": "string", "example": "60d0fe4f5311236168a109ce" },
                                  "status": { "type": "string", "enum": ["InProgress", "Submitted", "AutoSubmitted"] },
                                  "score": { "type": "number", "example": 7 }
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/quizzes/{id}": {
      "get": {
        "summary": "Get quiz by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" },
            "description": "MongoDB ID of the quiz"
          }
        ],
        "responses": {
          "200": {
            "description": "Details of the quiz",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "allOf": [
                        { "$ref": "#/components/schemas/Quiz" },
                        {
                          "type": "object",
                          "properties": {
                            "questionCount": { "type": "integer", "example": 12 },
                            "participantCount": { "type": "integer", "example": 15 }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Quiz not found"
          }
        }
      },
      "put": {
        "summary": "Update quiz details",
        "description": "Required role: Admin, or Instructor (must own the quiz). Edit is disallowed if the quiz status is Completed, Cancelled, or Expired.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" },
            "description": "MongoDB ID of the quiz"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": { "type": "string" },
                  "description": { "type": "string" },
                  "duration": { "type": "integer" },
                  "questionType": { "type": "string", "enum": ["single", "multi"] },
                  "startTime": { "type": "string", "format": "date-time", "nullable": true },
                  "endTime": { "type": "string", "format": "date-time", "nullable": true }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Quiz updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Quiz" }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete a quiz",
        "description": "Required role: Admin. Deletes the quiz and cascades deletion to associated questions, participants, and attempts.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Quiz deleted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "type": "object", "nullable": true, "example": null }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/quizzes/{id}/publish": {
      "post": {
        "summary": "Publish a draft quiz",
        "description": "Required role: Admin, or Instructor (must own the quiz). Validates completeness: must have at least 1 question, 1 participant, a start time, and an end time.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Quiz published successfully (becomes Live or Scheduled depending on time)",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Quiz" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Incomplete quiz or time parameters error"
          }
        }
      }
    },
    "/quizzes/{id}/cancel": {
      "post": {
        "summary": "Cancel an active or scheduled quiz",
        "description": "Required role: Admin or Instructor (must own the quiz). Marks status as Cancelled.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Quiz cancelled successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Quiz" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/questions": {
      "post": {
        "summary": "Add a question to a quiz",
        "description": "Required role: Admin or Instructor (creator). Allowed only for Draft status quizzes.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["quizId", "question", "options", "correctAnswers"],
                "properties": {
                  "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
                  "question": { "type": "string", "example": "What is the output of typeof null?" },
                  "options": {
                    "type": "array",
                    "items": { "type": "string" },
                    "minItems": 4,
                    "maxItems": 4,
                    "example": ["'object'", "'null'", "'undefined'", "'string'"]
                  },
                  "correctAnswers": {
                    "type": "array",
                    "items": { "type": "integer" },
                    "example": [0]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Question created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Question" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/questions/{id}": {
      "put": {
        "summary": "Edit a question",
        "description": "Required role: Admin or Instructor. Modifies a question belonging to a Draft status quiz.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "question": { "type": "string" },
                  "options": { "type": "array", "items": { "type": "string" } },
                  "correctAnswers": { "type": "array", "items": { "type": "integer" } }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Question updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Question" }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete a question",
        "description": "Required role: Admin or Instructor. Deletes a question from a Draft status quiz.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Question deleted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "type": "object", "nullable": true, "example": null }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/questions/quiz/{quizId}": {
      "get": {
        "summary": "Get all questions for a quiz",
        "description": "Retrieves questions. Security feature: if the requesting user is a candidate, the `correctAnswers` field is automatically omitted from the output objects.",
        "parameters": [
          {
            "name": "quizId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "List of questions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/Question" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/questions/bulk": {
      "post": {
        "summary": "Bulk import questions",
        "description": "Required role: Admin or Instructor. Allows uploading an array of questions directly to a Draft quiz.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["quizId", "questions"],
                "properties": {
                  "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
                  "questions": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": ["question", "options", "correctAnswers"],
                      "properties": {
                        "question": { "type": "string", "example": "What is Node.js?" },
                        "options": { "type": "array", "items": { "type": "string" }, "minItems": 4, "maxItems": 4 },
                        "correctAnswers": { "type": "array", "items": { "type": "integer" } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Questions imported successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "object",
                      "properties": {
                        "count": { "type": "integer", "example": 5 },
                        "questions": { "type": "array", "items": { "$ref": "#/components/schemas/Question" } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/participants/quiz/{quizId}": {
      "get": {
        "summary": "Get quiz participants",
        "description": "Required role: Admin or Instructor (creator). Returns list of assigned candidates for a quiz.",
        "parameters": [
          {
            "name": "quizId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "List of quiz assignments",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/Participant" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/participants/bulk": {
      "post": {
        "summary": "Assign candidates by emails in bulk",
        "description": "Required role: Admin or Instructor. Matches emails to register candidates and generates assignments for the Draft quiz.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["quizId", "emails"],
                "properties": {
                  "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" },
                  "emails": {
                    "type": "array",
                    "items": { "type": "string" },
                    "example": ["candidate1@example.com", "candidate2@example.com"]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Bulk assignment stats",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "object",
                      "properties": {
                        "importedCount": { "type": "integer", "example": 2 },
                        "registeredCount": { "type": "integer", "example": 2 },
                        "unregisteredCount": { "type": "integer", "example": 0 },
                        "unregisteredEmails": { "type": "array", "items": { "type": "string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/participants/{id}": {
      "delete": {
        "summary": "Remove candidate assignment",
        "description": "Required role: Admin or Instructor (creator). Removes participant record for Draft status quizzes.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" },
            "description": "Participant assignment record ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Candidate assignment removed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "type": "object", "nullable": true, "example": null }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/attempts/start": {
      "post": {
        "summary": "Start a quiz attempt",
        "description": "Required role: Candidate. Can only start attempts for Live status quizzes that the candidate is assigned to. Disallowed if attempt has already been created.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["quizId"],
                "properties": {
                  "quizId": { "type": "string", "example": "60d0fe4f5311236168a109cb" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Attempt started successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Attempt" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Already attempted, or quiz is not Live"
          }
        }
      }
    },
    "/attempts/save": {
      "post": {
        "summary": "Save candidate answers in progress",
        "description": "Required role: Candidate. Saves current choices during the attempt. If time is expired, the system will auto-submit the attempt and calculate the score.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["attemptId", "answers"],
                "properties": {
                  "attemptId": { "type": "string", "example": "60d0fe4f5311236168a109ce" },
                  "answers": {
                    "type": "object",
                    "additionalProperties": { "type": "array", "items": { "type": "integer" } },
                    "example": { "60d0fe4f5311236168a109cc": [0, 1] }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Saved successfully (or auto-submitted if time expired)",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "message": { "type": "string", "description": "Present if auto-submitted due to timeout", "example": "Time expired. Quiz has been auto-submitted." },
                    "data": { "$ref": "#/components/schemas/Attempt" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/attempts/submit": {
      "post": {
        "summary": "Submit quiz attempt",
        "description": "Required role: Candidate. Calculates final score and marks status as Submitted.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["attemptId"],
                "properties": {
                  "attemptId": { "type": "string", "example": "60d0fe4f5311236168a109ce" },
                  "answers": {
                    "type": "object",
                    "additionalProperties": { "type": "array", "items": { "type": "integer" } },
                    "example": { "60d0fe4f5311236168a109cc": [0] }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Submitted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Attempt" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/attempts/active/{quizId}": {
      "get": {
        "summary": "Get candidate's active (InProgress) attempt for a quiz",
        "description": "Required role: Candidate.",
        "parameters": [
          {
            "name": "quizId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Active attempt details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "oneOf": [
                        { "$ref": "#/components/schemas/Attempt" },
                        { "type": "object", "nullable": true, "example": null }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/attempts/{id}": {
      "get": {
        "summary": "Get attempt details",
        "description": "Required role: Owner Candidate, or Instructor (owner of the quiz), or Admin.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Attempt object populated with quiz & candidate details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": { "$ref": "#/components/schemas/Attempt" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/analytics/global": {
      "get": {
        "summary": "Get global dashboard metrics",
        "description": "Required role: Admin or Instructor. Admin sees platform-wide aggregates; Instructor sees metrics limited to quizzes they created.",
        "responses": {
          "200": {
            "description": "Global statistics count",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "object",
                      "properties": {
                        "quizzes": {
                          "type": "object",
                          "properties": {
                            "total": { "type": "integer", "example": 15 },
                            "draft": { "type": "integer", "example": 3 },
                            "scheduled": { "type": "integer", "example": 2 },
                            "live": { "type": "integer", "example": 2 },
                            "completed": { "type": "integer", "example": 7 },
                            "cancelled": { "type": "integer", "example": 0 },
                            "expired": { "type": "integer", "example": 1 }
                          }
                        },
                        "users": {
                          "type": "object",
                          "properties": {
                            "candidates": { "type": "integer", "example": 120 },
                            "instructors": { "type": "integer", "example": 5 }
                          }
                        },
                        "attempts": {
                          "type": "object",
                          "properties": {
                            "total": { "type": "integer", "example": 84 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/analytics/quiz/{quizId}": {
      "get": {
        "summary": "Get quiz analytics details",
        "description": "Required role: Admin or Instructor (creator). Returns counts, averages, score distribution, and student participation tables.",
        "parameters": [
          {
            "name": "quizId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Quiz statistics details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "object",
                      "properties": {
                        "quiz": {
                          "type": "object",
                          "properties": {
                            "id": { "type": "string" },
                            "title": { "type": "string" },
                            "status": { "type": "string" },
                            "maxScore": { "type": "integer", "example": 10 },
                            "endTime": { "type": "string", "format": "date-time" }
                          }
                        },
                        "metrics": {
                          "type": "object",
                          "properties": {
                            "assignedCount": { "type": "integer", "example": 12 },
                            "attemptedCount": { "type": "integer", "example": 9 },
                            "completedCount": { "type": "integer", "example": 8 },
                            "avgScore": { "type": "number", "example": 7.4 },
                            "highestScore": { "type": "number", "example": 10 },
                            "lowestScore": { "type": "number", "example": 4 }
                          }
                        },
                        "distribution": {
                          "type": "object",
                          "properties": {
                            "excellent": { "type": "integer", "example": 4 },
                            "good": { "type": "integer", "example": 3 },
                            "average": { "type": "integer", "example": 1 },
                            "poor": { "type": "integer", "example": 0 }
                          }
                        },
                        "participants": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "userId": { "type": "string" },
                              "name": { "type": "string" },
                              "email": { "type": "string" },
                              "status": { "type": "string", "enum": ["InProgress", "Submitted", "AutoSubmitted", "NotStarted"] },
                              "score": { "type": "number" },
                              "timeTaken": { "type": "number", "nullable": true },
                              "submittedAt": { "type": "string", "format": "date-time", "nullable": true },
                              "attemptId": { "type": "string", "nullable": true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/analytics/attempt/{attemptId}": {
      "get": {
        "summary": "Get detailed attempt report",
        "description": "Allows viewing question-by-question candidate choices, correctness markers, and feedback. Restricts to owner Candidate, creator Instructor, or Admin.",
        "parameters": [
          {
            "name": "attemptId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Complete question report card",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "data": {
                      "type": "object",
                      "properties": {
                        "attempt": {
                          "type": "object",
                          "properties": {
                            "id": { "type": "string" },
                            "quizId": { "type": "string" },
                            "startedAt": { "type": "string", "format": "date-time" },
                            "submittedAt": { "type": "string", "format": "date-time" },
                            "status": { "type": "string" },
                            "score": { "type": "number" },
                            "timeTaken": { "type": "number" }
                          }
                        },
                        "candidate": {
                          "type": "object",
                          "properties": {
                            "name": { "type": "string" },
                            "email": { "type": "string" }
                          }
                        },
                        "summary": {
                          "type": "object",
                          "properties": {
                            "totalQuestions": { "type": "integer", "example": 10 },
                            "correctCount": { "type": "integer", "example": 8 },
                            "incorrectCount": { "type": "integer", "example": 2 },
                            "percentage": { "type": "integer", "example": 80 }
                          }
                        },
                        "details": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "questionId": { "type": "string" },
                              "question": { "type": "string" },
                              "options": { "type": "array", "items": { "type": "string" } },
                              "correctAnswers": { "type": "array", "items": { "type": "integer" } },
                              "candidateAnswers": { "type": "array", "items": { "type": "integer" } },
                              "isCorrect": { "type": "boolean" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
