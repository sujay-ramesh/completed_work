document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('availabilityContainer');
        const addRowBtn = document.getElementById('addRowBtn');

        let rowCount = 0;

        // --- Time and Day Generation Logic ---

        /**
         * Generates time options with 15 minutes intervals, applying conflict and filter logic.
         * @param {string | null} filterValue - The time (HH:MM) to filter options by.
         * @param {Array<Object>} conflictSlots - An array of {start: 'HH:MM', end: 'HH:MM'} to hide.
         * @param {string | null} selectedTime - The currently selected time, to preserve its selection.
         * @param {boolean} isStartTimeSelect - True if generating options for the Start Time selector.
         * @param {string | null} selectedStartTime - The selected start time (used for end time generation).
         * @returns {string} HTML string of <option> elements.
         */
        function generateTimeOptions(filterValue, conflictSlots = [], selectedTime = null, isStartTimeSelect = false, selectedStartTime = null) {
            const options = [];
            
            // Sort conflict slots by start time for easier processing
            conflictSlots.sort((a, b) => a.start.localeCompare(b.start));

            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 15) {
                    const hour = h.toString().padStart(2, '0');
                    const minute = m.toString().padStart(2, '0');
                    const timeValue = `${hour}:${minute}`;
                    const timeComparison = `${hour}${minute}`;
                    let shouldSkip = false;

                    // For Start Time Selection
                    if (isStartTimeSelect) {
                        // Hide entire time ranges that are already booked
                        for (const slot of conflictSlots) {
                            if (timeValue >= slot.start && timeValue < slot.end) {
                                shouldSkip = true;
                                break;
                            }
                        }
                    } else {
                        // For End Time Selection
                        // 1. Must be after the selected start time
                        if (filterValue && timeComparison <= filterValue.replace(':', '')) {
                            continue;
                        }
                        
                        // 2. Find the next conflict slot after the selected start time
                        let nextConflictStart = null;
                        for (const slot of conflictSlots) {
                            if (slot.start > selectedStartTime) {
                                nextConflictStart = slot.start;
                                break;
                            }
                        }
                        
                        // 3. If there's a next conflict, end time must be before or at its start
                        if (nextConflictStart && timeValue > nextConflictStart) {
                            shouldSkip = true;
                        }
                        
                        // 4. End time cannot be in any existing slot range
                        for (const slot of conflictSlots) {
                            if (timeValue > slot.start && timeValue <= slot.end) {
                                shouldSkip = true;
                                break;
                            }
                        }
                    }
                    
                    if (shouldSkip) {
                        continue;
                    }
                    
                    const isSelected = selectedTime === timeValue;
                    const selectedAttr = isSelected ? 'selected' : '';

                    options.push(`<option value="${timeValue}" ${selectedAttr}>${timeValue}</option>`);
                }
            }
            return options.join('');
        }

        /**
         * Generates the day and date options for the day selector (Monday to Saturday).
         * @returns {string} HTML string of <option> elements.
         */
        function generateDayOptions() {
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const options = [];
            const today = new Date();
            let dayIndex = today.getDay(); 

            // Calculate the date for the previous or current Monday (Mon=1, Sun=0)
            let startDayOffset = (dayIndex === 0) ? -6 : 1 - dayIndex;
            let date = new Date(today);
            date.setDate(today.getDate() + startDayOffset);

            for (let i = 0; i < 6; i++) {
                const dayName = daysOfWeek[i];
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const dateString = `${dayName} (${day}/${month})`;
                const value = dayName.toLowerCase();

                options.push(`<option value="${value}">${dateString}</option>`);
                date.setDate(date.getDate() + 1);
            }
            return options.join('');
        }

        // Pre-generate the static day options
        const dayOptions = generateDayOptions();

        // --- Conflict Slot Retrieval Logic ---

        /**
         * Retrieves all existing, validated time slots for a specific day,
         * excluding the current row's slot.
         * @param {string} selectedDay - The day being checked (e.g., 'monday').
         * @param {HTMLElement} currentRow - The row element to exclude from the check.
         * @returns {Array<Object>} An array of conflicting slots {start: 'HH:MM', end: 'HH:MM'}.
         */
        function getExistingConflictSlots(selectedDay, currentRow) {
            const existingSlots = [];

            document.querySelectorAll('.availability-row').forEach(row => {
                // Only check other rows
                if (row !== currentRow) {
                    const daySelect = row.querySelector('.daySelect');
                    const startSelect = row.querySelector('.startTime');
                    const endSelect = row.querySelector('.endTime');

                    if (daySelect.value === selectedDay &&
                        startSelect.value && endSelect.value &&
                        startSelect.value < endSelect.value) { // Ensure validity
                        existingSlots.push({
                            start: startSelect.value,
                            end: endSelect.value
                        });
                    }
                }
            });
            return existingSlots;
        }

        // --- Dynamic Select Population and Event Handling ---

        /**
         * Filters the Start Time and End Time based on day selection and existing conflicts.
         * Also handles sequential enablement (Day -> Start Time -> End Time).
         * @param {HTMLElement} daySelect - The Day dropdown.
         * @param {HTMLElement} startTimeSelect - The Start Time dropdown.
         * @param {HTMLElement} endTimeSelect - The End Time dropdown to be filtered.
         */
        function setupTimeValidation(daySelect, startTimeSelect, endTimeSelect) {
            const disabledPlaceholder = (text) => `<option value="" disabled selected>${text}</option>`;

            // Initial state: disable time selectors
            startTimeSelect.disabled = true;
            endTimeSelect.disabled = true;
            
            // 1. Day Change Handler: Enables start time and filters its options
            daySelect.addEventListener('change', function() {
                const selectedDay = this.value;
                const currentRow = this.closest('.availability-row');
                
                // Preserve and reset values
                const previousStartTime = startTimeSelect.value;
                startTimeSelect.value = '';
                endTimeSelect.value = '';
                
                // Get all existing slots for this day
                const existingSlots = getExistingConflictSlots(selectedDay, currentRow);
                
                // Generate Start Time options, hiding any time that conflicts
                const newStartTimeOptions = generateTimeOptions(
                    null, 
                    existingSlots, 
                    previousStartTime, 
                    true,
                    null
                );
                
                startTimeSelect.innerHTML = disabledPlaceholder('Start Time') + newStartTimeOptions;
                endTimeSelect.innerHTML = disabledPlaceholder('End Time');
                endTimeSelect.disabled = true;
                
                // Enable Start Time
                startTimeSelect.disabled = false;
            });

            // 2. Start Time Change Handler: Enables end time and filters its options
            startTimeSelect.addEventListener('change', function() {
                const selectedDay = daySelect.value;
                const selectedStartTime = this.value;
                const currentRow = this.closest('.availability-row');
                const previousEndTime = endTimeSelect.value;

                // If the previously selected End Time is no longer valid (e.g., <= new Start Time), reset it
                if (previousEndTime && previousEndTime <= selectedStartTime) {
                     endTimeSelect.value = '';
                }
                
                // Get all slots for this day
                const existingSlots = getExistingConflictSlots(selectedDay, currentRow);
                
                // Re-populate the End Time options
                const newEndTimeOptions = generateTimeOptions(
                    selectedStartTime, 
                    existingSlots, 
                    endTimeSelect.value, 
                    false,
                    selectedStartTime
                );
                
                endTimeSelect.innerHTML = disabledPlaceholder('End Time') + newEndTimeOptions;

                // Enable End Time
                endTimeSelect.disabled = false;
            });
        }

        /**
         * Creates a new row of selectors.
         * @param {boolean} isInitial - True for the first row, preventing delete button creation.
         */
        function createNewRow(isInitial = false) {
            rowCount++;
            const rowId = `row-${rowCount}`;
            const row = document.createElement('div');
            row.className = 'availability-row';
            row.id = rowId;

            const disabledPlaceholder = (text) => `<option value="" disabled selected>${text}</option>`;

            // Create the select elements
            const daySelect = document.createElement('select');
            daySelect.name = `schedule[${rowCount}][day]`;
            daySelect.className = 'form-select daySelect';
            daySelect.required = true;
            daySelect.innerHTML = disabledPlaceholder('Select Day (Mon - Sat)') + dayOptions;

            const startTimeSelect = document.createElement('select');
            startTimeSelect.name = `schedule[${rowCount}][startTime]`;
            startTimeSelect.className = 'form-select startTime';
            startTimeSelect.required = true;
            startTimeSelect.innerHTML = disabledPlaceholder('Start Time');

            const endTimeSelect = document.createElement('select');
            endTimeSelect.name = `schedule[${rowCount}][endTime]`;
            endTimeSelect.className = 'form-select endTime';
            endTimeSelect.required = true;
            endTimeSelect.innerHTML = disabledPlaceholder('End Time');

            // Build the row structure using custom column sizes (from CSS)
            row.innerHTML = `
                <div>${daySelect.outerHTML}</div>
                <div>${startTimeSelect.outerHTML}</div>
                <div>${endTimeSelect.outerHTML}</div>
                <div id="delete-col-${rowId}"></div>
            `;

            container.appendChild(row);

            // Re-select the elements after they are added to the DOM to attach listeners
            const newDaySelect = row.querySelector('.daySelect');
            const newStartTimeSelect = row.querySelector('.startTime');
            const newEndTimeSelect = row.querySelector('.endTime');

            // Add the time validation logic
            setupTimeValidation(newDaySelect, newStartTimeSelect, newEndTimeSelect);

            // Add the delete button only if it's NOT the initial row
            if (!isInitial) {
                const deleteCol = document.getElementById(`delete-col-${rowId}`);
                deleteCol.innerHTML = `
                    <button type="button" class="btn btn-danger btn-sm remove-row" data-row-id="${rowId}" title="Remove slot">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                // Add event listener for the new remove button
                deleteCol.querySelector('.remove-row').addEventListener('click', function(e) {
                    const idToRemove = e.currentTarget.getAttribute('data-row-id');
                    document.getElementById(idToRemove).remove();

                    // After removing a row, all other rows must re-validate their time options
                    document.querySelectorAll('.availability-row').forEach(r => {
                        const dSelect = r.querySelector('.daySelect');
                        const sSelect = r.querySelector('.startTime');
                        
                                                if (dSelect.value) {
                             const event = new Event('change');
                             dSelect.dispatchEvent(event); 
                             
                             // Triggering the day change also updates the Start Time options.
                             // We need to re-trigger the Start Time change to update End Time options
                             // if a Start Time was selected.
                             if (sSelect.value) {
                                  sSelect.dispatchEvent(event);
                             }
                        }
                    });
                });
            }
        }

        // Add the initial row when the page loads
        createNewRow(true); 

        // Attach the event listener to the "Add Row" button
        addRowBtn.addEventListener('click', () => createNewRow(false)); 
    });