// Вспомогательные функции, возможно их будет можно удалить
function filterDatesAfter(dateArray, targetTime) {
    const [day, month, year] = targetTime.split(" ")[0].split(".");
    const target = new Date(`${year}-${month}-${day}`);

    return dateArray.filter((item) => {
        const [day, month, year] = item.date.split(" ")[0].split(".");
        const itemTarget = new Date(`${year}-${month}-${day}`);

        return itemTarget.getTime() > target.getTime();
    });
}

const getHourlyRentDates = async () => {
    return $.ajax({
        url: "data/hourlyRentDates.json",
        method: "GET",
        dataType: "json",
    });
};

const getAvailableStartDates = async () => {
    return $.ajax({
        url: "data/availableStartDates.json",
        method: "GET",
        dataType: "json",
    });
};

////////
const initHourlyDailyRent = async (availableHourlyRentDates, availableDailyStartDates) => {
    let availableDailyEndDates = [];
    let startRentTime;
    let endRentTime;
    const countDays = 20;
    const workHours = [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
    ];
    const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    const months = ["янв.", "фев.", "март", "апр.", "май", "июнь", "июль", "авг.", "сент.", "окт.", "нояб.", "дек."];

    const getAvailableEndDates = async (startTime) => {
        try {
            const data = await $.ajax({
                url: "data/availableEndDates.json",
                method: "GET",
                dataType: "json",
            });
            return filterDatesAfter(data, startTime);
        } catch (e) {}
    };

    const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split(".").map(Number);

        return new Date(year, month - 1, day);
    };

    const parseDateWithHoursMinutes = (str) => {
        const [datePart, timePart] = str.split(" ");
        const [day, month, year] = datePart.split(".").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);
        return new Date(year, month - 1, day, hours, minutes);
    };

    const getOnlyDays = (datesArray) => {
        return datesArray.reduce((acc, item) => {
            const [date] = item.date.split(" ");
            if (acc.find((item) => item === date)) {
                return acc;
            }

            return [...acc, date];
        }, []);
    };

    const getHoursInInterval = (datesArray, startStr, endStr) => {
        const parsedDates = datesArray.map((item) => parseDateWithHoursMinutes(item.date));

        const startDate = parseDateWithHoursMinutes(startStr);
        const endDate = parseDateWithHoursMinutes(endStr);

        const expectedDates = [];
        let current = new Date(startDate);
        while (current <= endDate) {
            expectedDates.push(new Date(current));
            current = new Date(current.getTime() + 60 * 60 * 1000);
        }

        const parsedTimes = new Set(parsedDates.map((d) => d.getTime()));

        const allPresent = expectedDates.every((d) => parsedTimes.has(d.getTime()));

        if (allPresent) {
            return expectedDates.map(
                (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            );
        }

        return undefined;
    };

    const handleClickRentalTimeHour = (currentTime) => {
        const $rentalTimeHours = $(".hourly-daily-rent-wrapper .rental-time-hours-wrapper .rental-time-hour");
        const [_, currentTimeHours] = currentTime.split(" ");

        if (startRentTime && endRentTime) {
            startRentTime = undefined;
            endRentTime = undefined;
        }

        if (!startRentTime) {
            startRentTime = currentTime;
            $rentalTimeHours.each((index, element) => {
                const $element = $(element);
                $element.removeClass("selected");
                if ($element.text() === currentTimeHours) {
                    $element.addClass("selected");
                }
            });
        } else {
            const hoursInInterval = getHoursInInterval(availableHourlyRentDates, startRentTime, currentTime);

            if (hoursInInterval?.length) {
                endRentTime = currentTime;
                $rentalTimeHours.each((index, element) => {
                    const $element = $(element);
                    $element.removeClass("selected");
                    if (hoursInInterval.find((item) => item === $element.text())) {
                        $element.addClass("selected");
                    }
                });
            } else {
                startRentTime = currentTime;
                endRentTime = undefined;
                $rentalTimeHours.each((index, element) => {
                    const $element = $(element);
                    $element.removeClass("selected");

                    if ($element.text() === currentTimeHours) {
                        $element.addClass("selected");
                    }
                });
            }
        }
    };

    const createHourlyHoursElements = (currentDate, dayElement, availableDates) => {
        const rentalDateDayWrappers = $(".hourly-daily-rent-wrapper .rental-date-day-wrapper");
        const rentalTimeHours = $(".hourly-daily-rent-wrapper .rental-time-hours");
        rentalTimeHours.empty();
        rentalDateDayWrappers.each((index, element) => {
            $(element).removeClass("selected");
        });
        const currentDateString = currentDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        workHours.forEach((hour) => {
            let $rentalTimeHour;
            const currentTime = `${currentDateString} ${hour}`;
            if (availableDates.find((item) => item.date === currentTime)) {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour`, text: hour });
                $rentalTimeHour.on("click", () => handleClickRentalTimeHour(currentTime));
            } else {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour disabled`, text: hour });
            }

            rentalTimeHours.append($rentalTimeHour);
        });

        dayElement.addClass("selected");
    };

    const handleClickHourlyDayElement = (currentDate, element) => {
        createHourlyHoursElements(currentDate, element, availableHourlyRentDates);
        startRentTime = undefined;
        endRentTime = undefined;
    };

    const createHourlyRentalCalendar = () => {
        const $rentalDate = $(".hourly-daily-rent-wrapper .rental-date-days");
        $rentalDate.empty();
        const availableDays = getOnlyDays(availableHourlyRentDates);
        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const isAvailable = availableDays.find((item) => item === dataDate);
            const $wrapper = $("<div>", {
                class: `rental-date-day-wrapper`,
                "data-date": dataDate,
            });
            const $day = $("<div>", {
                class: "rental-date-day",
                text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
            });
            const $month = $("<div>", {
                class: "rental-date-month",
                text: `${months[currentDate.getMonth()]}`,
            });
            if (!isAvailable) {
                $wrapper.addClass("disabled");
            } else {
                $wrapper.on("click", () => handleClickHourlyDayElement(currentDate, $wrapper));
            }
            $wrapper.append($day, $month);
            $rentalDate.append($wrapper);

            if (i === 0) {
                createHourlyHoursElements(currentDate, $wrapper, availableHourlyRentDates);
            }
        }
    };

    const handleClickDailyStartHour = async (currentTime) => {
        startRentTime = currentTime;
        const $dailyRentalTimeHours = $(".hourly-daily-rent-wrapper .daily-rental-time-hours .rental-time-hour");
        const $dailyReturnDateDays = $(".hourly-daily-rent-wrapper .daily-return-date-days");
        $dailyRentalTimeHours.each((index, element) => {
            const $element = $(element);

            $element.removeClass("selected");
            if ($element.attr("data-date") === currentTime) {
                $element.addClass("selected");
            }
        });
        // Получение доступных дат для окончания аренды
        availableDailyEndDates = await getAvailableEndDates(currentTime);
        const availableDailyEndDays = getOnlyDays(availableDailyEndDates);

        $dailyReturnDateDays.empty();

        for (let i = 0; i < countDays; i++) {
            const [day, month, year] = startRentTime.split(" ")[0].split(".");
            const currentDate = new Date(year, month - 1, day);
            currentDate.setDate(currentDate.getDate() + i + 1);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const isAvailable = availableDailyEndDays.find((item) => item === dataDate);
            const $wrapper = $("<div>", {
                class: "rental-date-day-wrapper",
                "data-date": dataDate,
            });
            const $day = $("<div>", {
                class: "rental-date-day",
                text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
            });
            const $month = $("<div>", {
                class: "rental-date-month",
                text: `${months[currentDate.getMonth()]}`,
            });

            if (!isAvailable) {
                $wrapper.addClass("disabled");
            } else {
                $wrapper.on("click", () => handleClickDailyEndDayElement(currentDate, $wrapper));
            }
            $wrapper.append($day, $month);
            $dailyReturnDateDays.append($wrapper);
        }
    };

    const createDailyStartHoursElements = (currentDate, availableDates) => {
        const $dailyRentalTimeHours = $(".hourly-daily-rent-wrapper .daily-rental-time-hours");
        $dailyRentalTimeHours.empty();

        const currentDateString = currentDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        workHours.forEach((hour) => {
            let $rentalTimeHour;
            const currentTime = `${currentDateString} ${hour}`;
            if (availableDates.find((item) => item.date === currentTime)) {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour`, text: hour, "data-date": currentTime });
                $rentalTimeHour.on("click", () => handleClickDailyStartHour(currentTime));
            } else {
                $rentalTimeHour = $("<div>", {
                    class: `rental-time-hour disabled`,
                    text: hour,
                    "data-date": currentTime,
                });
            }

            $dailyRentalTimeHours.append($rentalTimeHour);
        });
    };

    const handleClickDailyStartDayElement = (currentDate, dayElement) => {
        const $dailyRentalDateDayWrappers = $(".daily-rental-date-days .rental-date-day-wrapper");
        const $dailyReturnDateDays = $(".hourly-daily-rent-wrapper .daily-return-date-days");
        $dailyReturnDateDays.empty();
        $dailyRentalDateDayWrappers.each((index, element) => {
            $(element).removeClass("selected");
        });
        dayElement.addClass("selected");

        createDailyStartHoursElements(currentDate, availableDailyStartDates);
        startRentTime = undefined;
        endRentTime = undefined;

        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const $wrapper = $("<div>", {
                class: "rental-date-day-wrapper disabled",
                "data-date": dataDate,
            });
            const $day = $("<div>", {
                class: "rental-date-day",
                text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
            });
            const $month = $("<div>", {
                class: "rental-date-month",
                text: `${months[currentDate.getMonth()]}`,
            });

            $wrapper.append($day, $month);
            $dailyReturnDateDays.append($wrapper);
        }
        const $dailyReturnTimeHours = $(".hourly-daily-rent-wrapper .daily-return-time-hours");
        $dailyReturnTimeHours.empty();
        workHours.forEach((hour) => {
            let $rentalTimeHour = $("<div>", {
                class: `rental-time-hour disabled`,
                text: hour,
            });

            $dailyReturnTimeHours.append($rentalTimeHour);
        });
    };

    const handleClickDailyEndHour = (currentTime) => {
        const $dailyReturnEndHours = $(".hourly-daily-rent-wrapper .daily-return-time-hours .rental-time-hour");
        const $dailyRentalTimeHours = $(".hourly-daily-rent-wrapper .daily-rental-time-hours .rental-time-hour");
        const objectDateCurrentTime = parseDateWithHoursMinutes(currentTime);
        const objectDateStartRentTime = parseDateWithHoursMinutes(startRentTime);
        const startRentTimeStamps = objectDateStartRentTime.getTime();
        const currentTimeStamps = objectDateCurrentTime.getTime();

        $dailyRentalTimeHours.each((index, element) => {
            const $element = $(element);
            const elementTimeStamps = parseDateWithHoursMinutes($element.attr("data-date")).getTime();

            $element.removeClass("selected");
            if (elementTimeStamps >= startRentTimeStamps) {
                $element.addClass("selected");
            }
        });

        $dailyReturnEndHours.each((index, element) => {
            const $element = $(element);
            const elementTimeStamps = parseDateWithHoursMinutes($element.attr("data-date")).getTime();

            $element.removeClass("selected");
            if (elementTimeStamps <= currentTimeStamps) {
                $element.addClass("selected");
            }
        });
        endRentTime = currentTime;
    };

    // Создание элементов для выбора часов окончания аренды
    const createDailyEndHoursElements = (currentDate, availableDates) => {
        const $dailyReturnTimeHours = $(".hourly-daily-rent-wrapper .daily-return-time-hours");
        $dailyReturnTimeHours.empty();
        const currentDateString = currentDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        workHours.forEach((hour) => {
            let $rentalTimeHour;
            const currentTime = `${currentDateString} ${hour}`;
            if (availableDates.find((item) => item.date === currentTime)) {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour`, text: hour, "data-date": currentTime });
                $rentalTimeHour.on("click", () => handleClickDailyEndHour(currentTime));
            } else {
                $rentalTimeHour = $("<div>", {
                    class: `rental-time-hour disabled`,
                    text: hour,
                    "data-date": currentTime,
                });
            }

            $dailyReturnTimeHours.append($rentalTimeHour);
        });
    };

    const handleClickDailyEndDayElement = (currentDate, dayElement) => {
        endRentTime = undefined;
        const $dailyReturnDateDayWrappers = $(".daily-return-date-days .rental-date-day-wrapper");
        $dailyReturnDateDayWrappers.each((index, element) => {
            $(element).removeClass("selected");
        });
        dayElement.addClass("selected");

        createDailyEndHoursElements(currentDate, availableDailyEndDates);
    };

    const createDailyRentalCalendar = () => {
        const $dailyRentalDate = $(".hourly-daily-rent-wrapper .daily-rental-date-days");
        const $dailyReturnDate = $(".hourly-daily-rent-wrapper .daily-return-date-days");
        $dailyRentalDate.empty();
        $dailyReturnDate.empty();
        const availableDays = getOnlyDays(availableDailyStartDates);

        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const isAvailable = availableDays.find((item) => item === dataDate);
            const $wrapper = $("<div>", {
                class: `rental-date-day-wrapper${i === 0 ? " selected" : ""}`,
                "data-date": dataDate,
            });
            const $day = $("<div>", {
                class: "rental-date-day",
                text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
            });
            const $month = $("<div>", {
                class: "rental-date-month",
                text: `${months[currentDate.getMonth()]}`,
            });
            if (!isAvailable) {
                $wrapper.addClass("disabled");
            } else {
                $wrapper.on("click", () => handleClickDailyStartDayElement(currentDate, $wrapper));
            }

            $wrapper.append($day, $month);
            $dailyRentalDate.append($wrapper);

            if (i === 0) {
                createDailyStartHoursElements(currentDate, $wrapper, availableDailyStartDates);
            }
        }
        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const $wrapper = $("<div>", {
                class: "rental-date-day-wrapper disabled",
                "data-date": dataDate,
            });
            const $day = $("<div>", {
                class: "rental-date-day",
                text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
            });
            const $month = $("<div>", {
                class: "rental-date-month",
                text: `${months[currentDate.getMonth()]}`,
            });

            $wrapper.append($day, $month);
            $dailyReturnDate.append($wrapper);
        }
        const $dailyReturnTimeHours = $(".hourly-daily-rent-wrapper .daily-return-time-hours");
        $dailyReturnTimeHours.empty();
        workHours.forEach((hour) => {
            let $rentalTimeHour = $("<div>", {
                class: `rental-time-hour disabled`,
                text: hour,
            });

            $dailyReturnTimeHours.append($rentalTimeHour);
        });
    };

    const getNextDates = (startDateStr, count) => {
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        };

        let currentDate = parseDate(startDateStr);

        const result = [];

        for (let i = 1; i <= count; i++) {
            currentDate.setDate(currentDate.getDate() + 1);
            result.push(formatDate(currentDate));
        }

        return result;
    };

    const createHandlersClickDayArrows = ($dateDaysWrapper, $dateDays, handleClickDayElement, availableDates) => {
        let translate = 0;
        let isTransition = false;
        const handleClickDayArrowRight = () => {
            if (!isTransition) {
                isTransition = true;

                if (
                    $dateDays.outerWidth() + translate - $dateDaysWrapper.outerWidth() >=
                    $dateDaysWrapper.outerWidth()
                ) {
                    translate = translate - $dateDaysWrapper.outerWidth() - 5;
                    $dateDays.css("transform", `translateX(${translate}px)`);
                } else {
                    const lastDate = $dateDays.children().eq(-1).attr("data-date");
                    const nextDates = getNextDates(lastDate, 10);
                    const availableDays = getOnlyDays(availableDates);

                    nextDates.forEach((date) => {
                        const isAvailable = availableDays.find((item) => item === date);
                        const currentDate = parseDate(date);
                        const $wrapper = $("<div>", {
                            class: "rental-date-day-wrapper",
                            "data-date": date,
                        });
                        const $day = $("<div>", {
                            class: "rental-date-day",
                            text: `${days[currentDate.getDay()]}, ${currentDate.getDate()}`,
                        });
                        const $month = $("<div>", {
                            class: "rental-date-month",
                            text: `${months[currentDate.getMonth()]}`,
                        });

                        if (!isAvailable) {
                            $wrapper.addClass("disabled");
                        } else {
                            $wrapper.on("click", () => handleClickDayElement(currentDate, $wrapper));
                        }

                        $wrapper.append($day, $month);
                        $dateDays.append($wrapper);
                    });

                    translate = translate - $dateDaysWrapper.outerWidth() - 5;
                    $dateDays.css("transform", `translateX(${translate}px)`);
                }
            }
        };

        const handleClickDayArrowLeft = () => {
            if (!isTransition) {
                if (translate === 0) return;
                isTransition = true;
                translate = $dateDaysWrapper.outerWidth() + translate + 5;
                $dateDays.css("transform", `translateX(${translate}px)`);
            }
        };

        $dateDays.on("transitionend", () => {
            isTransition = false;
        });

        const setTranslate = (newTranslate) => (translate = newTranslate);

        return { handleClickDayArrowRight, handleClickDayArrowLeft, setTranslate };
    };

    const createHandlersClickHourArrows = ($hoursWrapper, $timeHours) => {
        let translate = 0;
        let isTransition = false;

        const handleClickHourArrowRight = () => {
            if (!isTransition) {
                if ($timeHours.outerWidth() + translate - $hoursWrapper.outerWidth() >= $hoursWrapper.outerWidth()) {
                    isTransition = true;
                    translate = translate - $hoursWrapper.outerWidth() - 5;
                    $timeHours.css("transform", `translateX(${translate}px)`);
                } else {
                    if (translate - $hoursWrapper.outerWidth() + $timeHours.outerWidth() === 0) return;
                    isTransition = true;
                    const remainingWidth = $timeHours.outerWidth() + translate - $hoursWrapper.outerWidth();
                    translate = translate - remainingWidth;
                    $timeHours.css("transform", `translateX(${translate}px)`);
                }
            }
        };

        const handleClickHourArrowLeft = () => {
            if (!isTransition) {
                if (translate === 0) return;
                if ($hoursWrapper.outerWidth() + translate > 0) {
                    isTransition = true;
                    translate = 0;
                    $timeHours.css("transform", `translateX(${translate}px)`);
                } else {
                    isTransition = true;
                    translate = $hoursWrapper.outerWidth() + translate + 5;
                    $timeHours.css("transform", `translateX(${translate}px)`);
                }
            }
        };

        $timeHours.on("transitionend", () => {
            isTransition = false;
        });

        const setTranslate = (newTranslate) => (translate = newTranslate);

        return { handleClickHourArrowRight, handleClickHourArrowLeft, setTranslate };
    };

    const {
        handleClickDayArrowRight: handleClickDailyEndDateArrowRight,
        handleClickDayArrowLeft: handleClickReturnDateArrowLeft,
        setTranslate: setTranslateDailyEndDay,
    } = createHandlersClickDayArrows(
        $(".hourly-daily-rent-wrapper .daily-return-date-days-wrapper"),
        $(".hourly-daily-rent-wrapper .daily-return-date-days"),
        handleClickDailyEndDayElement,
        availableDailyEndDates
    );

    const {
        handleClickDayArrowRight: handleClickRentalDateArrowRight,
        handleClickDayArrowLeft: handleClickRentalDateArrowLeft,
        setTranslate: setTranslateHourlyDate,
    } = createHandlersClickDayArrows(
        $(".hourly-daily-rent-wrapper .rental-date-days-wrapper"),
        $(".hourly-daily-rent-wrapper .rental-date-days"),
        handleClickHourlyDayElement,
        availableHourlyRentDates
    );
    const {
        handleClickDayArrowRight: handleClickStartDayArrowRight,
        handleClickDayArrowLeft: handleClickStartDayArrowLeft,
        setTranslate: setTranslateDailyStartDay,
    } = createHandlersClickDayArrows(
        $(".hourly-daily-rent-wrapper .daily-rental-date-days-wrapper"),
        $(".hourly-daily-rent-wrapper .daily-rental-date-days"),
        handleClickDailyStartDayElement,
        availableDailyStartDates
    );

    const {
        handleClickHourArrowRight: handleClickRentalTimeArrowRight,
        handleClickHourArrowLeft: handleClickRentalTimeArrowLeft,
        setTranslate: setTranslateHourlyTime,
    } = createHandlersClickHourArrows(
        $(".hourly-daily-rent-wrapper .rental-time-hours-wrapper"),
        $(".hourly-daily-rent-wrapper .rental-time-hours")
    );

    const {
        handleClickHourArrowRight: handleClickDailyStartHourArrowRight,
        handleClickHourArrowLeft: handleClickDailyStartHourArrowLeft,
        setTranslate: setTranslateDailyStartHour,
    } = createHandlersClickHourArrows(
        $(".hourly-daily-rent-wrapper .daily-rental-time-hours-wrapper"),
        $(".hourly-daily-rent-wrapper .daily-rental-time-hours")
    );

    const {
        handleClickHourArrowRight: handleClickDailyEndHourArrowRight,
        handleClickHourArrowLeft: handleClickDailyEndHourArrowLeft,
        setTranslate: setTranslateDailyEndHour,
    } = createHandlersClickHourArrows(
        $(".hourly-daily-rent-wrapper .daily-return-time-hours-wrapper"),
        $(".hourly-daily-rent-wrapper .daily-return-time-hours")
    );

    const $dailyReturnDateArrowLeft = $(".hourly-daily-rent-wrapper .daily-return-date-arrow-left");
    const $dailyReturnDateArrowRight = $(".hourly-daily-rent-wrapper .daily-return-date-arrow-right");
    const $rentalDateArrowLeft = $(".hourly-daily-rent-wrapper .rental-date-arrow-left");
    const $rentalDateArrowRight = $(".hourly-daily-rent-wrapper .rental-date-arrow-right");
    const $dailyRentalDateArrowLeft = $(".hourly-daily-rent-wrapper .daily-rental-date-arrow-left");
    const $dailyRentalDateArrowRight = $(".hourly-daily-rent-wrapper .daily-rental-date-arrow-right");
    const $dailyRentalTimeArrowLeft = $(".hourly-daily-rent-wrapper .daily-rental-time-arrow-left");
    const $dailyRentalTimeArrowRight = $(".hourly-daily-rent-wrapper .daily-rental-time-arrow-right");
    const $rentalTimeArrowLeft = $(".hourly-daily-rent-wrapper .rental-time-arrow-left");
    const $rentalTimeArrowRight = $(".hourly-daily-rent-wrapper .rental-time-arrow-right");
    const $dailyReturnTimeArrowLeft = $(".hourly-daily-rent-wrapper .daily-return-time-arrow-left");
    const $dailyReturnTimeArrowRight = $(".hourly-daily-rent-wrapper .daily-return-time-arrow-right");

    $dailyReturnTimeArrowRight.on("click", handleClickDailyEndHourArrowRight);
    $dailyReturnTimeArrowLeft.on("click", handleClickDailyEndHourArrowLeft);
    $dailyReturnDateArrowRight.on("click", handleClickDailyEndDateArrowRight);
    $dailyReturnDateArrowLeft.on("click", handleClickReturnDateArrowLeft);
    $dailyRentalTimeArrowLeft.on("click", handleClickDailyStartHourArrowLeft);
    $dailyRentalTimeArrowRight.on("click", handleClickDailyStartHourArrowRight);
    $dailyRentalDateArrowRight.on("click", handleClickStartDayArrowRight);
    $dailyRentalDateArrowLeft.on("click", handleClickStartDayArrowLeft);
    $rentalTimeArrowLeft.on("click", handleClickRentalTimeArrowLeft);
    $rentalTimeArrowRight.on("click", handleClickRentalTimeArrowRight);
    $rentalDateArrowRight.on("click", handleClickRentalDateArrowRight);
    $rentalDateArrowLeft.on("click", handleClickRentalDateArrowLeft);

    const $rentHourlyBtn = $(".hourly-daily-rent-wrapper .rent-hourly-btn");
    const $rentDailyBtn = $(".hourly-daily-rent-wrapper .rent-daily-btn");

    const handleRentHourlyBtnClick = () => {
        setTranslateHourlyDate(0);
        setTranslateHourlyTime(0);
        $rentDailyBtn.removeClass("active");
        $rentHourlyBtn.addClass("active");
        $(".hourly-wrapper").css("display", "flex");
        $(".daily-wrapper").css("display", "none");
        $(".hourly-daily-rent-wrapper .rental-date-days").css("transform", "translateX(0)");
        $(".hourly-daily-rent-wrapper .rental-time-hours").css("transform", "translateX(0)");
        createHourlyRentalCalendar(11);
    };

    const handleRentDailyBtnClick = () => {
        setTranslateDailyStartDay(0);
        setTranslateDailyStartHour(0);
        setTranslateDailyEndDay(0);
        setTranslateDailyEndHour(0);
        $rentHourlyBtn.removeClass("active");
        $rentDailyBtn.addClass("active");
        $(".hourly-wrapper").css("display", "none");
        $(".daily-wrapper").css("display", "flex");
        $(".hourly-daily-rent-wrapper .daily-rental-date-days").css("transform", "translateX(0)");
        $(".hourly-daily-rent-wrapper .daily-return-date-days").css("transform", "translateX(0)");
        $(".hourly-daily-rent-wrapper .daily-rental-time-hours").css("transform", "translateX(0)");
        $(".hourly-daily-rent-wrapper .daily-return-time-hours").css("transform", "translateX(0)");
        createDailyRentalCalendar(11);
    };

    $rentHourlyBtn.on("click", handleRentHourlyBtnClick);
    $rentDailyBtn.on("click", handleRentDailyBtnClick);

    createHourlyRentalCalendar(11);

    /*
     * Функционал для тестовой кнопки, удалить потом
     * */
    const $testButton = $(".test-on-complete");
    $testButton.on("click", () => console.log({ from: startRentTime, to: endRentTime }));
};

const startApp = async () => {
    const availableDailyStartDates = await getAvailableStartDates();
    const hourlyRentDates = await getHourlyRentDates();

    initHourlyDailyRent(hourlyRentDates, availableDailyStartDates);
};

startApp();
