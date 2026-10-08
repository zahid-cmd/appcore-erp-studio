Final locked definition
I would lock Page Cloning as:
Page Cloning is a template-based CRUD cloning engine. It accepts only pages that follow the AppCore standard CRUD architecture, loads the fixed set of 15 cloneable source files, analyzes the frontend model and its UI-driven fields, allows the user to define the target page's required fields, and then constructs the target 15 files by preserving the source page's established structure, behavior and coding pattern while adapting the confirmed target fields. CSS and Route files are excluded because they are standardized and fixed.

Yes — this is clear, and this is the architecture we should implement permanently.