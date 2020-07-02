import {
  ScheduleController,
  ScheduleEventController,
  InlineEditorController,
  ScheduleNoteController,
  PlaceholderController,
} from './schedule.js'

const application = Stimulus.Application.start()
application.register('schedule', ScheduleController)
application.register('schedule-event', ScheduleEventController)
application.register('inline-editor', InlineEditorController) // form-based Inline Editor
application.register('schedule-note', ScheduleNoteController) // similar, but with special validation
application.register('placeholder', PlaceholderController)
