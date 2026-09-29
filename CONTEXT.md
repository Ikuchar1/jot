# Jot

Jot is a todo app that anyone can sign up for, usable from a phone, a laptop browser, and AI assistants.

## Language

**User**:
A person who has signed up and owns their own todos.
_Avoid_: Account, member, customer

**Todo**:
A single thing a user needs to do. It belongs to exactly one list, has a title, is either done or not done, and may have a due date, notes, and a priority (high, medium, or low). A due date without a time means any time that day.
_Avoid_: Task, item

**List**:
A named group of todos, like "School" or "Personal". A todo can be moved from one list to another.
_Avoid_: Category, project, folder, tag

**Inbox**:
The default list. A todo not put in a specific list lands here. It always exists and can't be deleted.
_Avoid_: Default list, unsorted

**Overdue**:
A todo that isn't done and whose due time has passed — or, if it has a date but no time, whose due day has ended.
_Avoid_: Late, past due

**Today**:
Every not-done todo, across all lists, that is overdue or due today.
_Avoid_: Agenda, dashboard

**Upcoming**:
Every not-done todo, across all lists, due in the 7 days after today.
_Avoid_: Soon, later, next up

**Anytime**:
A not-done todo with no due date.
_Avoid_: Someday, undated, unscheduled

**Reminder**:
A scheduled nudge about a todo. It fires once, or repeats at a fixed interval from a start time (e.g. every 4 hours from 8am).
_Avoid_: Alert, notification

**Repeating todo**:
A todo that comes back on a schedule (e.g. every Tuesday). Completing one occurrence brings up the next.
_Avoid_: Recurring task, routine, habit
