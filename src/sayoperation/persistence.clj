(ns sayoperation.persistence
  (:use (clojure.contrib pprint)
        [clojure.contrib.duck-streams :only (append-spit)]
        (sayoperation utils config))
  (:import (java.io BufferedWriter FileWriter)))

(def *history* (ref []))

(defn save-state [games-ref users-ref]
  (save-data @games-ref *games-file*)
  (save-data @users-ref *users-file*))

(defn restore-state [games-ref users-ref]
  (let [games (restore-data *games-file*)
        users (restore-data *users-file*)]
    (when games (ref-set games-ref games))
    (when users (ref-set users-ref users))))

(defn save-history []
  (when @*history*
    (doseq [r @*history*]
      (append-spit *history-file* r)
      (append-spit *history-file* "\n"))
    (dosync (ref-set *history* []))))

(defn init-state [games-ref users-ref]
  ;; restore when loading server
  ;; or when re-evaluating source in dev
  (dosync (restore-state games-ref users-ref))

  ;; a repeating schedule for save-state and save-history
  (defonce *schedule*
    (future (while true
              (Thread/sleep (* 60000 5))
              (save-state games-ref users-ref)
              (save-history)))))


