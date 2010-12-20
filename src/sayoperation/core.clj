(ns sayoperation.core
  (:use
   (clojure.contrib pprint json str-utils)
   (sayoperation utils persistence config)))

;; user functions

(def *users* (ref {}))

(defn create-user [] {:last-ping (now)
                      :last-move-correct "no move"})

(defn def-user [id]
  (if (@*users* id) nil
      (ref-set *users* (assoc @*users* id (create-user)))))

(defn heard-from [id]
  (ref-set *users*
           (update-in
            @*users* [id]
            #(assoc % :last-ping (now)))))

(defn last-heard-from [id]
  "how many milliseconds ago was it"
  (if-let [last-ping (:last-ping (@*users* id))]
    (- (now) last-ping)
    *idle*))

(defn returning-user [id]
  (some (partial = id) (map key @*users*)))

(defn online? [id]
  (< (last-heard-from id) *idle*))

(defn users-online []
  (map key (filter (comp online? key) @*users*)))

(defn users-offline []
  (map key (filter (comp not online? key) @*users*)))

;; board functions

(defn board-positions []
  (for [x (range 6) y (range 3)] [x y]))

(def *pieces*
     ["ant"	"caterpillar" "fish" "orange-moth" "red-starfish"
      "azure-frog" "cat" "grasshopper" "owl" "snail"
      "bird" "crab" "ladybug" "rabbit" "turtle"
      "blue-moth" "crawfish" "red-frog"	"yellow-moth"])

(defn get-pieces []
  (take 7 (shuffle *pieces*)))

(defn create-board []
  (let [pieces (reduce #(assoc %1 (first %2) (second %2))
                       {} (map vector
                               (shuffle (board-positions))
                               (get-pieces)))
        subject (key (first pieces))
        target (first (drop-while
                       #(pieces %)
                       (shuffle (board-positions))))]
    (as-map pieces
            subject
            target)))

;; game functions

(def *games* (ref {}))

(defn game-index [id1 id2]
  (vec (sort [id1 id2])))

(defn lookup-games
  ([id1 id2]
     (@*games* (game-index id1 id2)))
  ([id]
     (filter #(or (= id (first (key %)))
                  (= id (second (key %))))
             @*games*)))

(defn create-game [player-one]
  {:score 0
   :turn "instruct"
   :whoseturn player-one
   :board (create-board)})

(defn def-game [id1 id2]
  "id1 is the person initiating the game,
   the first person to explain an operation."
  (or (@*games* (game-index id1 id2))
      (ref-set *games*
               (assoc @*games*
                 (game-index id1 id2)
                 (create-game id1)))))

(defn correct? [game move]
  (and (= (:target (:board game))
          (:target move))
       (= (:subject (:board game))
          (:subject move))))

(defn score [game move]
  (if (correct? game move)
    (+ (:score game) 50)
    (:score game)))

(defn instruction-turn
  "add points if the previous move was correct,
   and create a new board/target/subject."
  [whose-turn game last-move]
  {:score (score game last-move)
   :correct (correct? game last-move)
   :turn "instruct"
   :whoseturn whose-turn
   :board (create-board)})

(defn action-turn
  "provide the same board and the instruction
   from the previous user's move, for user to execute"
  [whose-turn game last-move]
  {:score (:score game)
   :turn "act"
   :whoseturn whose-turn
   :instruction (:instruction last-move)
   :board (:board game)})

(defn update-game
  "Update the game state based on move made in game.
   Turn cycle: 1/instruct -> 2/act -> 2/instruct -> 1/act"
  [id1 id2 move]
  (let [game (@*games* (game-index id1 id2))
        whoseturn (:whoseturn game)
        turn (:turn game)]

    ;; if the turn just taken was an action, record this data
    (when (= turn "act")
      (ref-set *history* (cons (as-map id1 id2 game move)
                               @*history*)))

    ;; record status of last move
    (ref-set *users*
             (update-in
              @*users* [id1]
              #(assoc % :last-move-correct
                      (if (= turn "act") 
                        (if (correct? game move) "correct" "incorrect")
                        "no move"))))
      
    (ref-set *games*
             (assoc @*games*
               (game-index id1 id2)               
               (condp = (vector whoseturn turn)
                   ;; if last move  ;; then next move          
                   [id1 "instruct"] (action-turn      id2 game move)
                   [id2      "act"] (instruction-turn id2 game move)
                   [id2 "instruct"] (action-turn      id1 game move)
                   [id1      "act"] (instruction-turn id1 game move))))))

(defn high-score [& id]
  (if (empty? @*games*)
    0
    (apply max
           (map (comp :score val)
                (if id
                  (lookup-games (first id))
                  @*games*)))))

(defn high-score-team []
  (if (empty? @*games*)
    ["no one" "no one"]
    (-> (sort-by (comp :score val) @*games*) last key)))

(defn events [id]
  (filter #(= id (:whoseturn (val %)))
          (lookup-games id)))

(defn ready? [id]
  (empty? (events id)))

(defn global-data []
  "this is returned with data when playing a move
   and is also sent as a global notification in
   some cases (when holder of high score changes,
   or when another user comes online)"
  {:users-online (users-online)
   :users-offline (users-offline)
   :high-score (high-score)
   :high-score-team (high-score-team)})

(defn game-state [id]
  (when (not (empty? (lookup-games id)))
    (let [[next-event-team
           next-event] (first (vec (take 1 (events id))))
           high-score (high-score id)
           global-data (global-data)
           last-correct (:last-move-correct (@*users* id))]
      (as-map next-event-team next-event
              high-score global-data last-correct))))
