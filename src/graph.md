graph TD
    A[Deep Link] --> B[Deferred]
    A --> C[Direct]

    %% Deferred path
    B --> B1[SDK Init]
    B1 --> B2[OneLink URL]
    B2 --> D[Implement]
    D --> E[Optional: isDeferred()]
    E --> F[Test Deferred]

    %% Direct path
    C --> C1[SDK Init]
    C1 --> C2[OneLink URL]
    C2 --> C3[App Link Intent Filter]
    C3 --> C4[URI Scheme (Optional)]
    C4 --> C5[SAD Signature]
    C5 --> C6[Get from Terminal]
    C6 --> G[Test Direct]

    %% Shared code step
    D --> H[Code]
    C6 --> H
