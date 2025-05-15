Avoid using comments;
SOLID Principles: This is an acronym for five object-oriented design principles that help create maintainable and scalable code.

Single Responsibility Principle (SRP): A class or module should have only one reason to change, meaning it should have only one job or responsibility. This aligns with the "Separate Concerns" principle.

Open/Closed Principle: Software entities (classes, modules, functions) should be open for extension but closed for modification.

Liskov Substitution Principle: Objects of a superclass should be replaceable with objects of its subclasses without affecting the correctness of the program.

Interface Segregation Principle: Clients should not be forced to depend on interfaces they do not use.

Dependency Inversion Principle: High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions.

DRY (Don't Repeat Yourself): This principle emphasizes avoiding code duplication to reduce maintenance complexity and potential inconsistencies. Continuously review and refactor your code to identify and eliminate repetitions.

KISS (Keep It Simple, Stupid): Encourage simplicity in your code and design, avoiding unnecessary complexity.

YAGNI (You Aren't Gonna Need It): Focus on delivering features that are currently needed, rather than over-engineering or anticipating future requirements that may never materialize.

Composition Over Inheritance: Favor using composition (combining simple objects or components to create more complex ones) over inheritance (creating new classes by inheriting properties and methods from a parent class) for code reuse and flexibility. This can lead to more modular and less coupled designs.

Law of Demeter (Principle of Least Knowledge): An object should have limited knowledge about other objects in the system, interacting only with its "close friends". This helps reduce coupling between components.