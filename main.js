let currentResultIndex = 0;
let searchResults = [];

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        notification.style.opacity = '0';
    }, 1500);

    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

function searchSponsor() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();

    if (searchTerm === '') {
        showNotification('검색어를 입력해주세요.');
        return;
    }

    const tables = document.getElementsByClassName('sponsor-table');
    searchResults = [];
    currentResultIndex = 0;

    for (let t = 0; t < tables.length; t++) {
        const cells = tables[t].getElementsByTagName('td');

        for (let i = 0; i < cells.length; i++) {
            cells[i].classList.remove('highlight');
            const cellContent = cells[i].textContent.toLowerCase();
            if (cellContent.includes(searchTerm)) {
                searchResults.push(cells[i]);
            }
        }
    }

    if (searchResults.length > 0) {
        highlightResult(0);
        showResultNavigation();
    } else {
        showNotification('검색 결과가 없습니다.');
        hideResultNavigation();
    }
}

function highlightResult(index) {
    searchResults.forEach(cell => cell.classList.remove('highlight'));
    searchResults[index].classList.add('highlight');
    searchResults[index].scrollIntoView({behavior: 'smooth', block: 'center'});
    updateResultCount();
}

function showResultNavigation() {
    const nav = document.getElementById('resultNavigation');
    nav.style.display = 'block';
    updateResultCount();
}

function hideResultNavigation() {
    const nav = document.getElementById('resultNavigation');
    nav.style.display = 'none';
}

function updateResultCount() {
    const countSpan = document.getElementById('resultCount');
    countSpan.textContent = `${currentResultIndex + 1} / ${searchResults.length}`;
}

function handleIntersection(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}

function setupIntersectionObserver() {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(handleIntersection, options);
    const images = document.querySelectorAll('.sponsor-image');
    images.forEach(img => observer.observe(img));
}

async function loadSponsors() {
    try {
        const response = await fetch('sponsors.json');
        const data = await response.json();
        const container = document.getElementById('sponsorContainer');

        const sponsorsPerGroup = 99; // 그룹당 후원자 인원
        const allSponsors = data.sponsors || [];
        const groupCount = Math.ceil(allSponsors.length / sponsorsPerGroup);

        const sliderImageCount = 3; // 슬라이드 이미지 개수
        const sliderImages = Array.from({ length: sliderImageCount }, (_, i) => `images/sliderimage${i.toString().padStart(2, '0')}.jpg`);

        for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            const section = document.createElement('div');
            section.className = 'sponsor-section ' + groupIndex;

            if (groupIndex === 0) {
                const sliderContainer = document.createElement('div');
                sliderContainer.className = 'slider-container';

                const sliderWrapper = document.createElement('div');
                sliderWrapper.className = 'slider-wrapper';

                sliderImages.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = 'slide cover-image';
                    sliderWrapper.appendChild(img);
                });

                const paginationDots = document.createElement('div');
                paginationDots.className = 'pagination-dots';
                sliderImages.forEach((_, index) => {
                    const dot = document.createElement('span');
                    dot.className = 'dot';
                    dot.setAttribute('data-index', index);
                    paginationDots.appendChild(dot);
                });

                sliderContainer.appendChild(sliderWrapper);
                sliderContainer.appendChild(paginationDots);
                section.appendChild(sliderContainer);

                const searchContainer = document.createElement('div');
                searchContainer.className = 'search-container';
                searchContainer.innerHTML = `
                    <input type="text" id="searchInput" placeholder="닉네임으로 검색...">
                    <button id="searchButton">검색</button>
                `;
                section.appendChild(searchContainer);

                initializeSlider(sliderWrapper);

            } else if (groupIndex + 1 < groupCount) {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'sponsor-image';
                const img = document.createElement('img');
                img.src = `images/image${(groupIndex - 1).toString().padStart(2, '0')}.jpg`;
                img.alt = `사진 ${groupIndex}`;
                img.className = 'cover-image';
                imageDiv.appendChild(img);
                section.appendChild(imageDiv);
            }

            const table = document.createElement('table');
            table.className = 'sponsor-table';
            const startIndex = groupIndex * sponsorsPerGroup;
            const endIndex = startIndex + sponsorsPerGroup;
            const groupSponsors = allSponsors.slice(startIndex, endIndex);

            for (let i = 0; i < groupSponsors.length; i += 3) {
                const row = table.insertRow();
                for (let j = 0; j < 3; j++) {
                    if (i + j < groupSponsors.length) {
                        const cell = row.insertCell();
                        cell.textContent = groupSponsors[i + j];
                    }
                }
            }

            section.appendChild(table);
            container.appendChild(section);
        }

        wrapNicknamesInSpan();
        setupIntersectionObserver();

        document.getElementById('searchButton').addEventListener('click', searchSponsor);
        document.getElementById('searchInput').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchSponsor();
            }
        });

        setupSlider();

    } catch (error) {
        console.error('Error loading sponsors:', error);
    }
}

// 슬라이드
function initializeSlider(sliderWrapper) {
    const slides = sliderWrapper.querySelectorAll('.slide');
    const totalSlides = slides.length;
    if (totalSlides <= 1) return;

    sliderWrapper.style.width = `${totalSlides * 100}%`;
    slides.forEach(slide => {
        slide.style.width = `${100 / totalSlides}%`;
    });
    const slideUnit = 100 / totalSlides;

    const dots = sliderWrapper.parentElement.querySelectorAll('.dot');
    const sliderContainer = sliderWrapper.parentElement;

    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let isDragging = false;
    let currentIndex = 0;
    let animationID;
    let autoSlideInterval;

    function updateDots() {
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function startAutoSlide() {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(() => {
            if (!isDragging) {
                currentIndex = (currentIndex + 1) % totalSlides;
                currentTranslate = -currentIndex * slideUnit; // 동적 계산
                sliderWrapper.style.transform = `translateX(${currentTranslate}%)`;
                updateDots();
            }
        }, 5000);
    }

    function setSliderPosition() {
        sliderWrapper.style.transform = `translateX(${currentTranslate}%)`;
    }

    function animation() {
        if (isDragging) {
            setSliderPosition();
            requestAnimationFrame(animation);
        }
    }

    function touchStart(event) {
        console.log(startX);
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        isDragging = true;
        sliderWrapper.style.transition = 'none';
        if (autoSlideInterval) clearInterval(autoSlideInterval);

        if (animationID) {
            cancelAnimationFrame(animationID);
        }
        animationID = requestAnimationFrame(animation);
    }

    function touchMove(event) {
        if (!isDragging) return;

        const currentX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        const diff = (currentX - startX) / sliderWrapper.offsetWidth * 100;
        currentTranslate = prevTranslate + diff;

        // 바운스 효과 제한
        const maxTranslate = -(totalSlides - 1) * slideUnit; // 최대 이동 값 동적 계산
        if (currentTranslate > 0) {
            currentTranslate = 0;
        } else if (currentTranslate < maxTranslate) {
            currentTranslate = maxTranslate;
        }
    }

    function touchEnd() {
        isDragging = false;
        const movedBy = currentTranslate - prevTranslate;

        sliderWrapper.style.transition = 'transform 0.3s ease-out';

        const slideOffset = (currentTranslate / slideUnit);

        currentIndex = Math.round(-slideOffset);

        if (currentIndex < 0) {
            currentIndex = 0;
        } else if (currentIndex >= totalSlides) {
            currentIndex = totalSlides - 1;
        }

        currentTranslate = -currentIndex * slideUnit;

        setSliderPosition();
        updateDots();
        prevTranslate = currentTranslate;
        startAutoSlide();
    }

    sliderWrapper.addEventListener('touchstart', touchStart, {passive: true});
    sliderWrapper.addEventListener('touchmove', touchMove, {passive: true});
    sliderWrapper.addEventListener('touchend', touchEnd);
    sliderWrapper.addEventListener('mousedown', touchStart);
    sliderWrapper.addEventListener('mousemove', touchMove);
    sliderWrapper.addEventListener('mouseup', touchEnd);
    sliderWrapper.addEventListener('mouseleave', touchEnd);

    // 페이지네이션 dots 클릭 이벤트
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            currentTranslate = -currentIndex * slideUnit;
            sliderWrapper.style.transition = 'transform 0.3s ease-out';
            setSliderPosition();
            updateDots();
            prevTranslate = currentTranslate;
            startAutoSlide();
        });
    });

    // 초기 상태 설정
    updateDots();
    startAutoSlide();
}

function wrapNicknamesInSpan() {
    const cells = document.querySelectorAll('.sponsor-table td');
    cells.forEach(cell => {
        const nickname = cell.textContent;
        cell.innerHTML = `<span class="nickname">${nickname}</span>`;
    });
}

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        topButton.style.opacity = "1";
    } else {
        topButton.style.opacity = "0";
    }
}

// 이벤트 리스너 설정
function initializeEventListeners() {

    // 이전 및 다음 결과 버튼 이벤트 리스너
    document.getElementById('prevResult').addEventListener('click', function() {
        if (searchResults.length > 0) {
            currentResultIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
            highlightResult(currentResultIndex);
        }
    });

    document.getElementById('nextResult').addEventListener('click', function() {
        if (searchResults.length > 0) {
            currentResultIndex = (currentResultIndex + 1) % searchResults.length;
            highlightResult(currentResultIndex);
        }
    });

    // 닫기 버튼 이벤트 리스너 추가
    document.getElementById('closeNavigation').addEventListener('click', function() {
        hideResultNavigation();
        // 하이라이트 제거
        searchResults.forEach(cell => cell.classList.remove('highlight'));
        searchResults = [];
        currentResultIndex = 0;
    });

    // Top 버튼 이벤트 리스너
    const topButton = document.getElementById("topButton");
    topButton.addEventListener("click", function() {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', scrollFunction);

    // 페이지 로드 시 후원자 데이터 불러오기
    window.addEventListener('load', loadSponsors);
}

// 초기화 함수 실행
initializeEventListeners();