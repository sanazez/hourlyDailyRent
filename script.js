const initHourlyDailyRent = async () => {
    let hourlyRentDates;
    let startRentTime;
    let endRentTime;
    let hourlyRentalHourTranslate = 0;
    let hourlyRentalDayTranslate = 0;
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

    const getHourlyRentDates = async () => {
        return $.ajax({
            url: "data/hourlyRentDates.json",
            method: "GET",
            dataType: "json",
            success: function (data) {
                hourlyRentDates = data;
            },
            error: function (jqXHR, textStatus, error) {
                console.error("Ошибка при загрузке данных:", textStatus, error);
            },
        });
    };

    const getHoursInInterval = (datesArray, startStr, endStr) => {
        const parseDate = (str) => {
            const [datePart, timePart] = str.split(" ");
            const [day, month, year] = datePart.split(".").map(Number);
            const [hours, minutes] = timePart.split(":").map(Number);
            return new Date(year, month - 1, day, hours, minutes);
        };

        const parsedDates = datesArray.map((item) => parseDate(item.date));

        const startDate = parseDate(startStr);
        const endDate = parseDate(endStr);

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
        const $rentalTimeHours = $(".hourly-daily-rent-wrapper .rental-time-hour");
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
            const hoursInInterval = getHoursInInterval(hourlyRentDates, startRentTime, currentTime);

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

    const createHoursElements = (currentDate, dayElement) => {
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
        workHours.forEach((hour, index) => {
            let $rentalTimeHour;
            const currentTime = `${currentDateString} ${hour}`;
            if (hourlyRentDates.find((item) => item.date === currentTime)) {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour`, text: hour });
                $rentalTimeHour.on("click", () => handleClickRentalTimeHour(currentTime));
            } else {
                $rentalTimeHour = $("<div>", { class: `rental-time-hour disabled`, text: hour });
            }

            rentalTimeHours.append($rentalTimeHour);
        });

        dayElement.addClass("selected");
    };

    const handleClickDayElement = (currentDate, element) => {
        createHoursElements(currentDate, element);
        startRentTime = undefined;
        endRentTime = undefined;
    };

    const createHourlyRentalCalendar = (countDays) => {
        const $rentalDate = $(".hourly-daily-rent-wrapper .rental-date-days");
        $rentalDate.empty();

        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
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

            $wrapper.on("click", () => handleClickDayElement(currentDate, $wrapper));
            $wrapper.append($day, $month);
            $rentalDate.append($wrapper);

            if (i === 0) {
                createHoursElements(currentDate, $wrapper);
            }
        }
    };

    const createDailyRentalCalendar = (countDays) => {
        const $dailyRentalDate = $(".hourly-daily-rent-wrapper .daily-rental-date-days");
        $dailyRentalDate.empty();

        for (let i = 0; i < countDays; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            const dataDate = currentDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
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

            $wrapper.on("click", () => handleClickDayElement(currentDate, $wrapper));
            $wrapper.append($day, $month);
            $dailyRentalDate.append($wrapper);

            /* if (i === 0) {
                createHoursElements(currentDate, $wrapper);
            }*/
        }
    };

    const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split(".").map(Number);
        return new Date(year, month - 1, day);
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

    const createHandlersRentalDateArrows = () => {
        const $rentalDateDaysWrapper = $(".hourly-daily-rent-wrapper .rental-date-days-wrapper");
        const $rentalDateDays = $(".hourly-daily-rent-wrapper .rental-date-days");
        let isTransition = false;
        const handleClickRentalDateArrowRight = () => {
            if (!isTransition) {
                isTransition = true;

                if (
                    $rentalDateDays.outerWidth() + hourlyRentalDayTranslate - $rentalDateDaysWrapper.outerWidth() >=
                    $rentalDateDaysWrapper.outerWidth()
                ) {
                    hourlyRentalDayTranslate = hourlyRentalDayTranslate - $rentalDateDaysWrapper.outerWidth() - 5;
                    $rentalDateDays.css("transform", `translateX(${hourlyRentalDayTranslate}px)`);
                } else {
                    const lastDate = $rentalDateDays.children().eq(-1).attr("data-date");
                    const nextDates = getNextDates(lastDate, 10);

                    nextDates.forEach((date) => {
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

                        $wrapper.on("click", () => handleClickDayElement(currentDate, $wrapper));
                        $wrapper.append($day, $month);
                        $rentalDateDays.append($wrapper);
                    });

                    hourlyRentalDayTranslate = hourlyRentalDayTranslate - $rentalDateDaysWrapper.outerWidth() - 5;
                    $rentalDateDays.css("transform", `translateX(${hourlyRentalDayTranslate}px)`);
                }
            }
        };

        const handleClickRentalDateArrowLeft = () => {
            if (!isTransition) {
                if (hourlyRentalDayTranslate === 0) return;
                isTransition = true;
                hourlyRentalDayTranslate = $rentalDateDaysWrapper.outerWidth() + hourlyRentalDayTranslate + 5;
                $rentalDateDays.css("transform", `translateX(${hourlyRentalDayTranslate}px)`);
            }
        };

        $rentalDateDays.on("transitionend", () => {
            isTransition = false;
        });

        return { handleClickRentalDateArrowRight, handleClickRentalDateArrowLeft };
    };
    const createHandlersRentalTimeArrows = () => {
        const $rentalTimeHoursWrapper = $(".hourly-daily-rent-wrapper .rental-time-hours-wrapper");
        const $rentalTimeHours = $(".hourly-daily-rent-wrapper .rental-time-hours");
        let isTransition = false;

        const handleClickRentalTimeArrowRight = () => {
            if (!isTransition) {
                if (
                    $rentalTimeHours.outerWidth() + hourlyRentalHourTranslate - $rentalTimeHoursWrapper.outerWidth() >=
                    $rentalTimeHoursWrapper.outerWidth()
                ) {
                    isTransition = true;
                    hourlyRentalHourTranslate = hourlyRentalHourTranslate - $rentalTimeHoursWrapper.outerWidth() - 5;
                    $rentalTimeHours.css("transform", `translateX(${hourlyRentalHourTranslate}px)`);
                } else {
                    if (
                        hourlyRentalHourTranslate -
                            $rentalTimeHoursWrapper.outerWidth() +
                            $rentalTimeHours.outerWidth() ===
                        0
                    )
                        return;
                    isTransition = true;
                    const remainingWidth =
                        $rentalTimeHours.outerWidth() +
                        hourlyRentalHourTranslate -
                        $rentalTimeHoursWrapper.outerWidth();
                    hourlyRentalHourTranslate = hourlyRentalHourTranslate - remainingWidth;
                    $rentalTimeHours.css("transform", `translateX(${hourlyRentalHourTranslate}px)`);
                }
            }
        };

        const handleClickRentalTimeArrowLeft = () => {
            if (!isTransition) {
                if (hourlyRentalHourTranslate === 0) return;
                if ($rentalTimeHoursWrapper.outerWidth() + hourlyRentalHourTranslate > 0) {
                    isTransition = true;
                    hourlyRentalHourTranslate = 0;
                    $rentalTimeHours.css("transform", `translateX(${hourlyRentalHourTranslate}px)`);
                } else {
                    isTransition = true;
                    hourlyRentalHourTranslate = $rentalTimeHoursWrapper.outerWidth() + hourlyRentalHourTranslate + 5;
                    $rentalTimeHours.css("transform", `translateX(${hourlyRentalHourTranslate}px)`);
                }
            }
        };

        $rentalTimeHours.on("transitionend", () => {
            isTransition = false;
        });

        return { handleClickRentalTimeArrowRight, handleClickRentalTimeArrowLeft };
    };

    const { handleClickRentalDateArrowRight, handleClickRentalDateArrowLeft } = createHandlersRentalDateArrows();
    const { handleClickRentalTimeArrowRight, handleClickRentalTimeArrowLeft } = createHandlersRentalTimeArrows();

    const $rentalDateArrowLeft = $(".hourly-daily-rent-wrapper .rental-date-arrow-left");
    const $rentalDateArrowRight = $(".hourly-daily-rent-wrapper .rental-date-arrow-right");
    const $rentHourlyBtn = $(".hourly-daily-rent-wrapper .rent-hourly-btn");
    const $rentDailyBtn = $(".hourly-daily-rent-wrapper .rent-daily-btn");
    const $rentalTimeArrowLeft = $(".hourly-daily-rent-wrapper .rental-time-arrow-left");
    const $rentalTimeArrowRight = $(".hourly-daily-rent-wrapper .rental-time-arrow-right");

    $rentalTimeArrowLeft.on("click", handleClickRentalTimeArrowLeft);
    $rentalTimeArrowRight.on("click", handleClickRentalTimeArrowRight);
    $rentalDateArrowRight.on("click", handleClickRentalDateArrowRight);
    $rentalDateArrowLeft.on("click", handleClickRentalDateArrowLeft);

    const handleRentHourlyBtnClick = () => {
        $rentDailyBtn.removeClass("active");
        $rentHourlyBtn.addClass("active");
        $(".hourly-wrapper").css("display", "block");
        $(".daily-wrapper").css("display", "none");
        $(".hourly-daily-rent-wrapper .rental-date-days").css("transform", "translateX(0)");
        $(".hourly-daily-rent-wrapper .rental-time-hours").css("transform", "translateX(0)");
        hourlyRentalHourTranslate = 0;
        hourlyRentalDayTranslate = 0;
        createHourlyRentalCalendar(11);
    };

    const handleRentDailyBtnClick = () => {
        $rentHourlyBtn.removeClass("active");
        $rentDailyBtn.addClass("active");
        $(".hourly-wrapper").css("display", "none");
        $(".daily-wrapper").css("display", "block");
        createDailyRentalCalendar(11);
    };
    $rentalDateArrowRight.on("click", handleClickRentalDateArrowRight);
    $rentalDateArrowLeft.on("click", handleClickRentalDateArrowLeft);
    $rentHourlyBtn.on("click", handleRentHourlyBtnClick);
    $rentDailyBtn.on("click", handleRentDailyBtnClick);

    await getHourlyRentDates();
    createHourlyRentalCalendar(11);

    /*
     * Функционал для тестовой кнопки, удалить потом
     * */
    const $testButton = $(".test-on-complete");
    $testButton.on("click", () => console.log({ from: startRentTime, to: endRentTime }));
};

initHourlyDailyRent();
