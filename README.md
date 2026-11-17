# databot

Databot allows you to scrape HTML websites around a topic fully and iteratively based on an initial website, allowing the user to control what content to select.      

# features

- Flat HTML website scraping     
- Card item scraping (todo)     

This is still under developments and much features don't work.     

# progress

- backend framework 📌       
- frontend mockup 📌      
- backend/frontend connection 📌    

# backend

- init_search(): takes a webpages and suggest elements to scrape     
- save_init_search(): take the elements and save as a csv     
- expand_searching_attr(): take randomly 10 entry from csv, google search and summarize attributes scraped.     

wrap these utility functions into these routes:     
- /init_search: applies init_search() and then save_init_search(), returns the initial csv     
- /expand_search: take the initial csv, apply expand_searching_attr(), return the searched attributes for the 10 entries     
- /search: take n requested attributes, all included in the searched attributes from the second route, conduct google search summarization for each of the entries in the initial csv.     